import flask
from flask_sock import Sock
from flask_cors import CORS
import json
import traceback
import time
import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from insert import insert_jobs, insert_resumes, update_job
import linkedin
import jobright
import workday
import greenhouse
import lever
import ashby
from recommend import recommend_by_job, recommend_by_resume
from misc import delete_job, add_application, delete_application, system_check
from preprocess_job import extract_source_from_url

from datetime import datetime
import os
import psycopg2
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

insert_lock = threading.Lock()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

app = flask.Flask(__name__)
CORS(app)
sock = Sock(app)

def get_db_connection():
    db_host = os.environ.get("POSTGRES_HOST", "postgres")
    try:
        return psycopg2.connect(
            host=db_host,
            user=os.environ.get("POSTGRES_USER"),
            password=os.environ.get("POSTGRES_PASSWORD"),
            database=os.environ.get("POSTGRES_DB"),
            port=os.environ.get("POSTGRES_PORT")
        )
    except psycopg2.OperationalError:
        if db_host != "localhost":
            return psycopg2.connect(
                host="localhost",
                user=os.environ.get("POSTGRES_USER"),
                password=os.environ.get("POSTGRES_PASSWORD"),
                database=os.environ.get("POSTGRES_DB"),
                port=os.environ.get("POSTGRES_PORT")
            )
        raise

def get_company_ats_provider(company):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT ats FROM company_ats WHERE company = %s OR LOWER(company) = LOWER(%s)",
            (company, company)
        )
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        if row:
            return row[0]
    except Exception as e:
        print(f"DB query error: {e}")
    return None

def get_all_companies():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT DISTINCT company FROM company_ats WHERE LOWER(ats) IN ('workday', 'lever', 'ashby', 'greenhouse') ORDER BY company"
        )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return [row[0] for row in rows]
    except Exception as e:
        print(f"DB query error: {e}")
        return []


def get_jobs_by_ids(job_ids):
    if not job_ids:
        return []
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, company, title, url FROM jobs WHERE id = ANY(%s)",
            (job_ids,)
        )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return [{"id": r[0], "company": r[1], "title": r[2], "url": r[3]} for r in rows]
    except Exception as e:
        print(f"Error fetching jobs by ids: {e}")
        return []
  
def log_scrape_to_db(log_time, log_type, status, scraped_jobs, filtered_jobs, duplicated_jobs, new_jobs, duration, company=None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO logs (log_time, type, status, scraped_jobs, filtered_jobs, duplicated_jobs, new_jobs, duration, company)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (log_time, log_type, status, scraped_jobs, filtered_jobs, duplicated_jobs, new_jobs, duration, company)
        )
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error logging to db: {e}")

def _scrape_single_company(company):
    scrape_start_time = datetime.now()
    try:
        ats_provider = get_company_ats_provider(company)
        if not ats_provider:
            msg = f"Skipping company '{company}': No ATS provider found."
            print(msg)
            duration = round((datetime.now() - scrape_start_time).total_seconds(), 2)
            log_scrape_to_db(scrape_start_time, 'daily scrape', msg, 0, 0, 0, 0, duration, company)
            return company, None, []
        
        ats_provider = ats_provider.lower()
        
        if ats_provider == 'workday':
            scrape_res = workday.scrape(company)
        elif ats_provider == 'greenhouse':
            scrape_res = greenhouse.scrape(company)
        elif ats_provider == 'lever':
            scrape_res = lever.scrape(company)
        elif ats_provider == 'ashby':
            scrape_res = ashby.scrape(company)
        else:
            msg = f"Skipping unsupported ATS provider '{ats_provider}' for company '{company}'."
            print(msg)
            duration = round((datetime.now() - scrape_start_time).total_seconds(), 2)
            log_scrape_to_db(scrape_start_time, 'daily scrape', msg, 0, 0, 0, 0, duration, company)
            return company, None, []
        
        if isinstance(scrape_res, tuple):
            jobs, scraped_jobs_count, filtered_jobs_count = scrape_res
        else:
            jobs = scrape_res
            scraped_jobs_count = len(jobs) if jobs else 0
            filtered_jobs_count = len(jobs) if jobs else 0
        
        if jobs:
            with insert_lock:
                new_jobs_list = insert_jobs(jobs, company, method='scrape')
            company_new_ids = [j['id'] for j in new_jobs_list if isinstance(j, dict) and 'id' in j]
            new_jobs = len(company_new_ids)
            dup_jobs = filtered_jobs_count - new_jobs
            filtered_jobs = filtered_jobs_count
            scraped_jobs = scraped_jobs_count
            
            duration = round((datetime.now() - scrape_start_time).total_seconds(), 2)
            log_scrape_to_db(scrape_start_time, 'daily scrape', 'success', scraped_jobs, filtered_jobs, dup_jobs, new_jobs, duration, company)
            return company, {
                "scraped_jobs": scraped_jobs,
                "filtered_jobs": filtered_jobs,
                "duplicated_jobs": dup_jobs,
                "new_jobs": new_jobs,
                "duration": duration
            }, company_new_ids
        else:
            new_jobs = 0
            dup_jobs = filtered_jobs_count
            filtered_jobs = filtered_jobs_count
            scraped_jobs = scraped_jobs_count
            
            duration = round((datetime.now() - scrape_start_time).total_seconds(), 2)
            log_scrape_to_db(scrape_start_time, 'daily scrape', 'success', scraped_jobs, filtered_jobs, dup_jobs, new_jobs, duration, company)
            return company, {
                "scraped_jobs": scraped_jobs,
                "filtered_jobs": filtered_jobs,
                "duplicated_jobs": dup_jobs,
                "new_jobs": new_jobs,
                "duration": duration
            }, []
    except Exception as e:
        err_msg = traceback.format_exc()
        print(f"Error scraping company '{company}': {e}")
        traceback.print_exc()
        duration = round((datetime.now() - scrape_start_time).total_seconds(), 2)
        log_scrape_to_db(scrape_start_time, 'daily scrape', err_msg, 0, 0, 0, 0, duration, company)
        return company, {"error": str(e)}, []



def send_jobs_email(jobs_details, recipient_email=None):
    if not jobs_details:
        print("No new jobs to send via email.")
        return False

    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    sender_email = os.environ.get("SMTP_USER", "")
    sender_password = os.environ.get("SMTP_PASSWORD", "")
    
    if not recipient_email:
        recipient_email = os.environ.get("RECIPIENT_EMAIL", sender_email)
        
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"New Job Postings Alert ({len(jobs_details)} new jobs)"
    msg["From"] = sender_email
    msg["To"] = recipient_email
    
    text_content = "New Jobs Scraped:\n\n"
    for job in jobs_details:
        text_content += f"- [{job['company']}] {job['title']}\n  URL: {job['url']}\n\n"
        
    html_content = """
    <html>
    <body>
        <h2>New Job Postings Alert</h2>
        <p>The following new jobs were scraped and added:</p>
        <ul>
    """
    for job in jobs_details:
        html_content += f"""
            <li>
                <strong>{job['company']}</strong> - {job['title']}<br>
                <a href="{job['url']}">{job['url']}</a>
            </li>
        """
    html_content += """
        </ul>
    </body>
    </html>
    """
    
    msg.attach(MIMEText(text_content, "plain"))
    msg.attach(MIMEText(html_content, "html"))
    
    try:
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        if sender_password:
            server.login(sender_email, sender_password)
        server.sendmail(sender_email, recipient_email, msg.as_string())
        server.quit()
        print(f"Email sent successfully to {recipient_email}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

def log_daily_scrape(status, scraped_jobs=0, filtered_jobs=0, duplicated_jobs=0, new_jobs=0, duration=0.0):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO logs (log_time, type, status, scraped_jobs, filtered_jobs, duplicated_jobs, new_jobs, duration, company)
            VALUES (NOW(), %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            ('daily scrape summary', status, scraped_jobs, filtered_jobs, duplicated_jobs, new_jobs, duration, None)
        )
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error saving to logs: {e}")



@sock.route('/scrape_jobsite')
def ws_scrape_jobsite(ws):
    raw = ws.receive()
    data = json.loads(raw)
    
    ### Scrape Jobsite ###
    ws.send(json.dumps({"type": "scrape", "action": "start"}))
    source = data['jobsite']
    
    try:
        if source == 'linkedin':
            jobs = linkedin.scrape(data['numJobs'], ws)
        elif source == 'jobright': 
            jobs = jobright.scrape(data['numJobs'], ws) 
        else:
            ats_provider = get_company_ats_provider(source).lower()
            if ats_provider == 'workday':
                jobs_res = workday.scrape(source, ws)
            elif ats_provider == 'greenhouse':
                jobs_res = greenhouse.scrape(source, ws)
            elif ats_provider == 'lever':
                jobs_res = lever.scrape(source, ws)
            elif ats_provider == 'ashby':
                jobs_res = ashby.scrape(source, ws)
            else:
                raise NotImplementedError(f"Scraping source/company '{source}' is not supported.")
            
            if isinstance(jobs_res, tuple):
                jobs = jobs_res[0]
            else:
                jobs = jobs_res
        
        ws.send(json.dumps({"type": "scrape", "action": "success"}))                
    except Exception as e:
        traceback.print_exc()
        ws.send(json.dumps({"type": "scrape", "action": "fail", "error": str(e)}))                
        time.sleep(0.1)
        ws.close()    
        return

    ### Insert Jobs ###
    new_ids = insert_jobs(jobs, source, ws, method='scrape')
        
    ### Recommend Jobs ###
    recommend_by_job(new_ids, ws)

          
@sock.route('/scrape_url')
def ws_scrape_url(ws):
    raw = ws.receive()
    data = json.loads(raw)
    
    url = data['url']
    source = extract_source_from_url(url)
    
    ws.send(json.dumps({"type": "scrape", "action": "start"}))
            
    ### Scrape URL ###
    try:
        if source == 'linkedin':
            job = linkedin.scrape_from_url(url)
        elif source == 'jobright': 
            job = jobright.scrape_from_url(url) 
        elif source == 'workday':
            job = workday.scrape_from_url(url)
        elif source == 'greenhouse':
            job = greenhouse.scrape_from_url(url)
        elif source == 'lever':
            job = lever.scrape_from_url(url)
        elif source == 'ashby':
            job = ashby.scrape_from_url(url)
        else:
            raise NotImplementedError(f"Scraping source '{source}' is not supported.")
        
        jobs = [job]
        ws.send(json.dumps({"type": "scrape", "action": "update"}))
        ws.send(json.dumps({"type": "scrape", "action": "success"}))                
    except Exception as e:
        traceback.print_exc()
        ws.send(json.dumps({"type": "scrape", "action": "fail", "error": str(e)}))                
        time.sleep(0.1)
        ws.close()
        return
        
    ### Insert Job ###
    new_ids = insert_jobs(jobs, source, ws, method='url')
    
    ### Recommend Jobs ###
    recommend_by_job(new_ids, ws)

    ws.close()

@sock.route('/manual_job')
def ws_manual_job(ws):
    raw = ws.receive()
    data = json.loads(raw)
    
    jobs = data['newJobs']
    source = data['type']
    
    ### Insert Job ###
    new_jobs = insert_jobs(jobs, source, ws, method='manual')
    
    ### Recommend Job ###
    recommend_by_job(new_jobs, ws)
    
    
@sock.route('/update_job')
def ws_update_job(ws):
    raw = ws.receive()
    data = json.loads(raw)
        
    ### Update Job ###
    new_ids = insert_jobs(ws, None, None, isUpdate=True, data=data)
    
    if not data['descriptionUpdated']:
        ws.close()
    
    ### Recommend Job ###
    recommend_jobs_ws(ws, new_ids)    


@sock.route('/resumes')
def ws_resumes(ws):
    raw = ws.receive()
    data = json.loads(raw)
    
    ### Insert Resume ###
    ws.send(json.dumps({"type": "insert", "action": "start"}))
    
    try:
        resumes = insert_resumes(data)        
        ws.send(json.dumps({"type": "insert", "action": "success"}))                
    except Exception as e:
        traceback.print_exc()
        ws.send(json.dumps({"type": "insert", "action": "fail", "error": str(e)}))                
        time.sleep(0.1)
        ws.close()
        return
        
    ## Recommend ###
    if len(resumes) > 0:
        recommend_by_resume(resumes, ws)
    else:
        ws.send(json.dumps({"type": "recommend", "action": "skipped"}))
    
    ws.close()
   

@app.route('/jobs', methods=['DELETE'])
def app_delete_job():
    try:
        job_id = flask.request.args.get('id', type=int)
        delete_job(job_id)
        return "Delete job success", 200
    except:
        return "Delete job failed", 500
    
    
@app.route('/system_check')
def app_system_check():
    try:
        in_pg_not_qdrant, in_qdrant_not_pg, mismatched_scrape_dates = system_check()
        return flask.jsonify({
            "in_pg_not_qdrant": len(in_pg_not_qdrant),
            "in_qdrant_not_pg": len(in_qdrant_not_pg),
            "mismatched_scrape_dates": len(mismatched_scrape_dates)            
        }), 200
    except:
        return "System check failed", 500


@app.route('/applications', methods=['POST'])
def app_add_application():
    try:
        data = flask.request.get_json()
        add_application(data['id'])
        return "Add application success", 200
    except:
        traceback.print_exc()
        return "Add application failed", 500
    
    
@app.route('/applications', methods=['DELETE'])
def app_delete_application():
    try:
        job_id = flask.request.args.get('id', type=int)
        delete_application(job_id)
        return "Delete application success", 200
    except:
        traceback.print_exc()
        return "Delete application failed", 500


@app.route('/companies', methods=['GET'])
def app_get_companies():
    try:
        companies = get_all_companies()
        return flask.jsonify(companies), 200
    except Exception as e:
        traceback.print_exc()
        return str(e), 500


@app.route('/scrape_ats', methods=['GET'])
def app_scrape_predefined_companies():
    """
    GET API function to scrape a list of predefined companies concurrently,
    insert new jobs, look up job company, title, and url by new IDs,
    and send the job information via email.
    """
    start_time = datetime.now()
    total_scraped_jobs = 0
    total_filtered_jobs = 0
    total_duplicated_jobs = 0
    total_new_jobs = 0

    try:
        companies = get_all_companies()
        if not companies:
            print("No companies found to scrape.")
            log_daily_scrape("Success", 0, 0, 0, 0, 0.0)
            return flask.jsonify({
                "status": "success",
                "total_scraped_jobs": 0,
                "total_filtered_jobs": 0,
                "total_duplicated_jobs": 0,
                "total_new_jobs": 0,
                "duration": 0.0,
                "company_results": {},
                "email_sent": False
            }), 200

        all_new_ids = []
        company_results = {}
        
        max_workers = min(len(companies), 10)

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_company = {executor.submit(_scrape_single_company, company): company for company in companies}
            for future in as_completed(future_to_company):
                company, res_dict, company_new_ids = future.result()
                if res_dict is not None and "error" not in res_dict:
                    company_results[company] = res_dict
                    total_scraped_jobs += res_dict.get("scraped_jobs", 0)
                    total_filtered_jobs += res_dict.get("filtered_jobs", 0)
                    total_duplicated_jobs += res_dict.get("duplicated_jobs", 0)
                    total_new_jobs += res_dict.get("new_jobs", 0)
                elif res_dict is not None:
                    company_results[company] = res_dict
                if company_new_ids:
                    all_new_ids.extend(company_new_ids)
                
        # Look up job details (company, title, url) by new IDs
        jobs_details = get_jobs_by_ids(all_new_ids)
        
        # Send email if new jobs were found
        email_sent = False
        if jobs_details:
            email_sent = send_jobs_email(jobs_details)
            
        duration = round((datetime.now() - start_time).total_seconds(), 2)
        log_daily_scrape(
            "Success",
            scraped_jobs=total_scraped_jobs,
            filtered_jobs=total_filtered_jobs,
            duplicated_jobs=total_duplicated_jobs,
            new_jobs=total_new_jobs,
            duration=duration
        )

        return flask.jsonify({
            "status": "success",
            "total_scraped_jobs": total_scraped_jobs,
            "total_filtered_jobs": total_filtered_jobs,
            "total_duplicated_jobs": total_duplicated_jobs,
            "total_new_jobs": len(all_new_ids),
            "duration": duration,
            "jobs": jobs_details,
            "company_results": company_results,
            "email_sent": email_sent
        }), 200
    except Exception as e:
        traceback.print_exc()
        error_msg = str(e)
        duration = round((datetime.now() - start_time).total_seconds(), 2)
        log_daily_scrape(
            error_msg,
            scraped_jobs=total_scraped_jobs,
            filtered_jobs=total_filtered_jobs,
            duplicated_jobs=total_duplicated_jobs,
            new_jobs=total_new_jobs,
            duration=duration
        )
        return flask.jsonify({"status": "error", "error": error_msg}), 500


if __name__ == '__main__':
    print("Python backend started")
    app.run(host="0.0.0.0", port=8080, threaded=True)