import flask
from flask_sock import Sock
from flask_cors import CORS
import json
import traceback
import time
import requests
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

app = flask.Flask(__name__)
CORS(app)
sock = Sock(app)

  
@sock.route('/scrape_jobsite')
def ws_scrape_jobsite(ws):
    raw = ws.receive()
    data = json.loads(raw)
    
    ### Scrape Jobsite ###
    ws.send(json.dumps({"type": "scrape", "action": "start"}))
    source = data['jobsite']
    
    try:
        if source in workday.COMPANY_TO_URL:
            jobs = workday.scrape(source, ws)
        elif source in greenhouse.COMPANY_TO_BOARD:
            jobs = greenhouse.scrape(source, ws)
        elif source in lever.COMPANY_TO_BOARD:
            jobs = lever.scrape(source, ws)
        elif source in ashby.COMPANY_TO_BOARD:
            jobs = ashby.scrape(source, ws)
        elif source == 'linkedin':
            jobs = linkedin.scrape(data['numJobs'], ws)
        elif source == 'jobright': 
            jobs = jobright.scrape(data['numJobs'], ws) 
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
    new_ids = insert_jobs(jobs, source, ws)
        
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
    new_ids = insert_jobs(jobs, source, ws)
    
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
    new_jobs = insert_jobs(jobs, source, ws)
    
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
        companies = []
        companies.extend(workday.COMPANY_TO_URL.keys())
        companies.extend(greenhouse.COMPANY_TO_BOARD.keys())
        companies.extend(lever.COMPANY_TO_BOARD.keys())
        companies.extend(ashby.COMPANY_TO_BOARD.keys())
        companies.sort()
        return flask.jsonify(companies), 200
    except Exception as e:
        traceback.print_exc()
        return str(e), 500


if __name__ == '__main__':
    print("Python backend started")
    app.run(host="0.0.0.0", port=8080, threaded=True)