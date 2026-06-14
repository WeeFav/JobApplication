import flask
from flask_sock import Sock
from flask_cors import CORS
import json
import traceback
import time
import requests
import threading
from queue import Queue
from insert import insert_jobs, insert_resumes, update_job
import linkedin
import jobright
from recommend import recommend_by_job, recommend_by_resume
from misc import delete_job, add_application, delete_application, system_check
from preprocess_job import extract_source_from_url

app = flask.Flask(__name__)
CORS(app)
sock = Sock(app)

def insert_jobs_ws(ws, jobs, source, isUpdate=False, data=None):
    ws.send(json.dumps({"type": "insert", "start": True}))
    
    try:
        if isUpdate:
            new_ids = update_job(data['updatedJob'], data['descriptionUpdated'], ws)
        else:
            new_ids = insert_jobs(jobs, source, ws)
        
        ws.send(json.dumps({"type": "insert", "success": True}))                
        return new_ids   
    except Exception as e:
        traceback.print_exc()
        ws.send(json.dumps({"type": "insert", "fail": True}))                
        ws.close()
        
 
def recommend_jobs_ws(ws, new_ids):
    ### Recommend ###       
    ws.send(json.dumps({"type": "recommend", "start": True}))
    
    try:
        recommend_by_job(new_ids)
        ws.send(json.dumps({"type": "recommend", "success": True}))                
    except Exception as e:
        traceback.print_exc()
        ws.send(json.dumps({"type": "recommend", "fail": True}))                
        ws.close()    
 

@sock.route('/test')
def test_ws(ws):
    raw = ws.receive()
    data = json.loads(raw)
    
    ws.send(json.dumps({"type": "scrape", "start": True}))
    time.sleep(1)
    for i in range(5):
        ws.send(json.dumps({"type": "scrape", "update": True}))
        time.sleep(1) 
    ws.send(json.dumps({"type": "scrape", "success": True}))                
    
    ws.send(json.dumps({"type": "insert", "start": True}))
    time.sleep(1)
    for i in range(5):
        ws.send(json.dumps({"type": "insert", "update": True}))
        time.sleep(1) 
    ws.send(json.dumps({"type": "insert", "success": True}))                
     
    ws.send(json.dumps({"type": "recommend", "start": True}))
    time.sleep(1)
    for i in range(5):
        ws.send(json.dumps({"type": "recommend", "update": True}))
        time.sleep(1) 
    ws.send(json.dumps({"type": "recommend", "success": True}))                
    
    ws.close()
  
@sock.route('/scrape_jobsite')
def ws_scrape_jobsite(ws):
    raw = ws.receive()
    data = json.loads(raw)
    
    ### Scrape Jobsite ###
    ws.send(json.dumps({"type": "scrape", "start": True}))
    source = data['jobsite']
    
    try:
        if source == 'linkedin':
            jobs = linkedin.scrape(data['numJobs'], ws)
        elif source == 'jobright': 
            jobs = jobright.scrape(data['numJobs'], ws) 
        else:
            raise NotImplementedError  
        
        ws.send(json.dumps({"type": "scrape", "success": True}))                
    except Exception as e:
        traceback.print_exc()
        ws.send(json.dumps({"type": "scrape", "fail": True}))                
        ws.close()    
        return

    ### Insert Jobs ###
    new_ids = insert_jobs_ws(ws, jobs, source)
        
    ### Recommend Jobs ###
    recommend_jobs_ws(ws, new_ids)

          
@sock.route('/scrape_url')
def ws_scrape_url(ws):
    raw = ws.receive()
    data = json.loads(raw)
    
    url = data['url']
    source = extract_source_from_url(url)
    
    ws.send(json.dumps({"type": "scrape", "start": True}))
            
    ### Scrape URL ###
    try:
        if source == 'linkedin':
            job = linkedin.scrape_from_url(url)
        elif source == 'jobright': 
            job = jobright.scrape_from_url(url) 
        else:
            raise NotImplementedError  
        
        jobs = [job]
        ws.send(json.dumps({"type": "scrape", "success": True}))                
    except Exception as e:
        traceback.print_exc()
        ws.send(json.dumps({"type": "scrape", "fail": True}))                
        ws.close()
        return
        
    ### Insert Job ###
    new_ids = insert_jobs_ws(ws, jobs, source)
    
    ### Recommend Jobs ###
    recommend_jobs_ws(ws, new_ids)    
    
    # add_application(new_ids[0])


@sock.route('/manual_job')
def ws_manual_job(ws):
    raw = ws.receive()
    data = json.loads(raw)
    
    jobs = data['newJobs']
    source = data['type']
    
    ### Insert Job ###
    new_ids = insert_jobs_ws(ws, jobs, source)
    
    ### Recommend Job ###
    recommend_jobs_ws(ws, new_ids)
    
    
@sock.route('/update_job')
def ws_update_job(ws):
    raw = ws.receive()
    data = json.loads(raw)
        
    ### Update Job ###
    new_ids = insert_jobs_ws(ws, None, None, isUpdate=True, data=data)
    
    if not data['descriptionUpdated']:
        ws.close()
    
    ### Recommend Job ###
    recommend_jobs_ws(ws, new_ids)    


@sock.route('/resumes')
def ws_resumes(ws):
    raw = ws.receive()
    updatedResumes = json.loads(raw)
    
    ### Insert Resume ###
    ws.send(json.dumps({"type": "insert", "start": True}))
    
    try:
        ids = insert_resumes(updatedResumes)        
        ws.send(json.dumps({"type": "insert", "success": True}))                
    except Exception as e:
        traceback.print_exc()
        ws.send(json.dumps({"type": "insert", "fail": True}))                
        ws.close()
        
    ### Recommend ###
    if len(ids) > 0:
        ws.send(json.dumps({"type": "recommend", "start": True}))
        
        try:
            q = Queue()
            t = threading.Thread(target=recommend_by_resume, args=(ids, q))
            t.start()
            
            # Stream updates from queue to WebSocket
            while True:
                update = q.get()  # blocking wait
                if "done" in update:
                    break
                ws.send(json.dumps({"type": "recommend", "update": True})) 
            
            ws.send(json.dumps({"type": "recommend", "success": True}))                
        except Exception as e:
            traceback.print_exc()
            ws.send(json.dumps({"type": "recommend", "fail": True}))                
    
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


if __name__ == '__main__':
    print("Python backend started")
    app.run(host="0.0.0.0", port=8080, threaded=True)