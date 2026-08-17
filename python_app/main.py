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

import os
import psycopg2
from dotenv import load_dotenv

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

def log_daily_scrape(status, new_jobs=None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO daily_scrape_log (log_date, status, new_jobs) VALUES (NOW(), %s, %s)",
            (status, new_jobs)
        )
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error saving to daily_scrape_log: {e}")

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
                jobs = workday.scrape(source, ws)
            elif ats_provider == 'greenhouse':
                jobs = greenhouse.scrape(source, ws)
            elif ats_provider == 'lever':
                jobs = lever.scrape(source, ws)
            elif ats_provider == 'ashby':
                jobs = ashby.scrape(source, ws)
            else:
                raise NotImplementedError(f"Scraping source/company '{source}' is not supported.")
        
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
    GET API function to scrape a list of predefined companies,
    insert new jobs, look up job company, title, and url by new IDs,
    and send the job information via email.
    """
    try:
        companies = ['NVIDIA', 'Intel', 'ASML', 'Applied Materials', 'Sony', 'Spotify', 'OpenAI', 'Nuro']
        
        all_new_ids = []
        company_results = {}
        
        for company in companies:
            try:
                ats_provider = get_company_ats_provider(company)
                if not ats_provider:
                    print(f"Skipping company '{company}': No ATS provider found.")
                    continue
                
                ats_provider = ats_provider.lower()
                
                if ats_provider == 'workday':
                    jobs = workday.scrape(company)
                elif ats_provider == 'greenhouse':
                    jobs = greenhouse.scrape(company)
                elif ats_provider == 'lever':
                    jobs = lever.scrape(company)
                elif ats_provider == 'ashby':
                    jobs = ashby.scrape(company)
                else:
                    print(f"Skipping unsupported ATS provider '{ats_provider}' for company '{company}'.")
                    continue
                
                if jobs:
                    new_jobs = insert_jobs(jobs, company, method='scrape')
                    company_new_ids = [j['id'] for j in new_jobs if isinstance(j, dict) and 'id' in j]
                    all_new_ids.extend(company_new_ids)
                    company_results[company] = {"scraped": len(jobs), "new": len(company_new_ids)}
                else:
                    company_results[company] = {"scraped": 0, "new": 0}
            except Exception as e:
                print(f"Error scraping company '{company}': {e}")
                traceback.print_exc()
                company_results[company] = {"error": str(e)}
                
        # Look up job details (company, title, url) by new IDs
        jobs_details = get_jobs_by_ids(all_new_ids)
        
        # Send email if new jobs were found
        email_sent = False
        if jobs_details:
            email_sent = send_jobs_email(jobs_details)
            
        jobs_sent_count = len(jobs_details) if email_sent else 0
        log_daily_scrape("Success", jobs_sent_count)

        return flask.jsonify({
            "status": "success",
            "total_new_jobs": len(all_new_ids),
            "jobs": jobs_details,
            "company_results": company_results,
            "email_sent": email_sent
        }), 200
    except Exception as e:
        traceback.print_exc()
        error_msg = str(e)
        log_daily_scrape(error_msg, None)
        return flask.jsonify({"status": "error", "error": error_msg}), 500


if __name__ == '__main__':
    print("Python backend started")
    app.run(host="0.0.0.0", port=8080, threaded=True)