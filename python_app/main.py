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

def scrape_jobs_ws(ws, num_jobs, source):
    """websocket update/error handling wrapper around scrape job logic"""
    try:
        ws.send(json.dumps({"type": "scrape", "start": True}))
        
        jobs = []
        q = Queue()

        if source == 'linkedin':
            t = threading.Thread(target=linkedin.scrape, args=(num_jobs, q))
        elif source == 'jobright':
            t = threading.Thread(target=jobright.scrape, args=(num_jobs, q))
        else:
            raise NotImplementedError
        t.start()

        while True:
            update = q.get()
            if "done" in update:
                break

            jobs.append(update)
            ws.send(json.dumps({"type": "scrape", "update": True}))

        if not update["done"]:
            raise RuntimeError("Scrape failed")

        ws.send(json.dumps({"type": "scrape", "success": True}))
        return jobs
    except Exception:
        traceback.print_exc()
        ws.send(json.dumps({"type": "scrape", "fail": True}))                
        ws.close()    


def scrape_url_ws(ws, url):
    """websocket update/error handling wrapper around scrape url logic"""
    try:
        ws.send(json.dumps({"type": "scrape", "start": True}))
        
        source = extract_source_from_url(url)
        q = Queue()
            
        if source == 'linkedin':
            t = threading.Thread(target=linkedin.scrape_from_url, args=(url, q))
        elif source == 'jobright': 
            t = threading.Thread(target=jobright.scrape_from_url, args=(url, q)) 
        else:
            raise NotImplementedError  
        t.start()
        
        # Stream updates from queue to WebSocket
        update = q.get()  # blocking wait
        
        if "fail" in update:
            raise RuntimeError
        
        job = update
        ws.send(json.dumps({"type": "scrape", "success": True}))                
        return job, source
    except Exception as e:
        traceback.print_exc()
        ws.send(json.dumps({"type": "scrape", "fail": True}))                
        ws.close()


def insert_jobs_ws(ws, jobs, source, isUpdate=False, data=None):
    """websocket update/error handling wrapper around insert job logic"""
    try:
        ws.send(json.dumps({"type": "insert", "start": True}))
        
        new_ids = []
        q = Queue()
    
        if isUpdate:
            t = threading.Thread(target=update_job, args=(data['updatedJob'], data['descriptionUpdated'], q))
        else:
            t = threading.Thread(target=insert_jobs, args=(jobs, source, q))   
        t.start()
        
        # Stream updates from queue to WebSocket
        while True:
            update = q.get()  # blocking wait
            
            if "done" in update: # either entire operation is successful or something fails
                break 
            elif "id" in update: # one job is done
                new_ids.append(update["id"])
                ws.send(json.dumps({"type": "insert", "update": True})) # for scrape page
            elif "postgres" in update:
                ws.send(json.dumps({"type": "insert", "postgres": True})) # for add/edit job page
            elif "qdrant" in update:
                ws.send(json.dumps({"type": "insert", "qdrant": True})) # for add/edit job page
        
        # check if operation is successful
        if not update["done"]:
            raise RuntimeError
        
        ws.send(json.dumps({"type": "insert", "success": True}))                
        return new_ids   
    except Exception as e:
        traceback.print_exc()
        ws.send(json.dumps({"type": "insert", "fail": True}))                
        ws.close()
   

def recommend_jobs_ws(ws, new_ids):
    """websocket update/error handling wrapper around recommend by job logic"""
    try:
        ws.send(json.dumps({"type": "recommend", "start": True}))
        
        q = Queue()
        
        t = threading.Thread(target=recommend_by_job, args=(new_ids, q))
        t.start()
        
        # Stream updates from queue to WebSocket
        while True:
            update = q.get()  # blocking wait
            if "done" in update: # either entire operation is successful or something fails
                break
            
        # check if operation is successful
        if not update["done"]:
            raise RuntimeError
        
        print(1)
        ws.send(json.dumps({"type": "recommend", "success": True}))                
        print(2)
    except Exception as e:
        traceback.print_exc()
        ws.send(json.dumps({"type": "recommend", "fail": True}))                
        ws.close()
            

def insert_resumes_ws(ws, resumes):
    """websocket update/error handling wrapper around insert resume logic"""
    try:
        ws.send(json.dumps({"type": "insert", "start": True}))
        ids = insert_resumes(updatedResumes)        
        ws.send(json.dumps({"type": "insert", "success": True}))                
        return ids
    except Exception as e:
        traceback.print_exc()
        ws.send(json.dumps({"type": "insert", "fail": True}))                
        ws.close()
    
    
def recommend_resumes_ws(ws, ids):
    """websocket update/error handling wrapper around recommend by resume logic"""
    try:
        ws.send(json.dumps({"type": "recommend", "start": True}))
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
    
    jobs = scrape_jobs_ws(ws, data["numJobs"], data["jobsite"])
    new_ids = insert_jobs_ws(ws, jobs, data["jobsite"])
    recommend_jobs_ws(ws, new_ids)    
    ws.close() # close if all operations are successful


@sock.route('/scrape_url')
def ws_scrape_url(ws):
    raw = ws.receive()
    data = json.loads(raw)
    url = data['url']
    
    ### Scrape URL ###
    job, source = scrape_url_ws(ws, url)
    ### Insert Job ###
    new_ids = insert_jobs_ws(ws, [job], source)
    ### Recommend Jobs ###
    recommend_jobs_ws(ws, new_ids)    
    
    add_application(new_ids[0])
    ws.close() # close if all operations are successful
   
    
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
    ws.close() # close if all operations are successful
    

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
    ws.close() # close if all operations are successful
    

@sock.route('/resumes')
def ws_resumes(ws):
    raw = ws.receive()
    updatedResumes = json.loads(raw)
    
    ### Insert Resume ###
    ids = insert_resumes_ws(ws, updatedResumes)
    ### Recommend ###
    if len(ids) > 0:
        recommend_resumes_ws(ws, ids)
    ws.close() # close if all operations are successful
             
                            
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


@app.post("/daily-scrape")
def daily_scrape():
    data = flask.request.get_json()
    num_jobs = data["numJobs"]
    source = data["jobsite"]
    q = Queue()
    
    ### Scrape ###
    try:        
        jobs = []

        if source == 'linkedin':
            t = threading.Thread(target=linkedin.scrape, args=(num_jobs, q))
        elif source == 'jobright':
            t = threading.Thread(target=jobright.scrape, args=(num_jobs, q))
        else:
            raise NotImplementedError
        t.start()

        while True:
            update = q.get()
            if "done" in update:
                break

            jobs.append(update)

        if not update["done"]:
            raise RuntimeError("Scrape failed")

    except Exception:
        traceback.print_exc()
        return "Scrape failed", 500
        
    ### Insert ###
    try:        
        new_ids = []
    
        t = threading.Thread(target=insert_jobs, args=(jobs, source, q))   
        t.start()
        
        # Stream updates from queue to WebSocket
        while True:
            update = q.get()  # blocking wait
            
            if "done" in update: # either entire operation is successful or something fails
                break 
            elif "id" in update: # one job is done
                new_ids.append(update["id"])
        
        # check if operation is successful
        if not update["done"]:
            raise RuntimeError
        
    except Exception as e:
        traceback.print_exc()
        return "Insert failed", 500
    
    ### Recommend ###
    try:
        t = threading.Thread(target=recommend_by_job, args=(new_ids, q))
        t.start()
        
        # Stream updates from queue to WebSocket
        while True:
            update = q.get()  # blocking wait
            if "done" in update: # either entire operation is successful or something fails
                break
            
        # check if operation is successful
        if not update["done"]:
            raise RuntimeError
        
    except Exception as e:
        traceback.print_exc()
        return "Recommend failed", 500
    

if __name__ == '__main__':
    print("Python backend started")
    app.run(host="0.0.0.0", port=8080)