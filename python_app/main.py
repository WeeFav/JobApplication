import flask
from flask_sock import Sock
from flask_cors import CORS
import json
import traceback
import time
import requests
import threading
from queue import Queue
from insert import insert_jobs, insert_resumes, delete_job, update_job
from linkedin import scrape_linkedin
from jobright import scrape_jobright
from recommend import recommend_by_job, recommend_by_resume

app = flask.Flask(__name__)
CORS(app)
sock = Sock(app)
 
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
 
@sock.route('/jobs')
def jobs_ws(ws):
    raw = ws.receive()
    data = json.loads(raw)
    edit = False
    
    ### Scrape Jobs ###
    if 'jobsite' in data and 'numJobs' in data:
        ws.send(json.dumps({"type": "scrape", "start": True}))
        
        jobs = []
        source = data['jobsite']
        
        try:
            q = Queue()
            if source == 'linkedin':
                t = threading.Thread(target=scrape_linkedin, args=(data['numJobs'], q))
            elif source == 'jobright': 
                t = threading.Thread(target=scrape_jobright, args=(data['numJobs'], q)) 
            else:
                raise NotImplementedError  
            t.start()
            
            # Stream updates from queue to WebSocket
            while True:
                update = q.get()  # blocking wait
                if "done" in update:
                    break
                jobs.append(update)
                ws.send(json.dumps({"type": "scrape", "update": True})) 
            
            if not update["done"]:
                raise RuntimeError
            
            ws.send(json.dumps({"type": "scrape", "success": True}))                
        except Exception as e:
            traceback.print_exc()
            ws.send(json.dumps({"type": "scrape", "success": False}))                
            ws.close()    
    ### Get Jobs ###
    elif 'newJobs' in data and 'type' in data:
        jobs = data['newJobs']
        source = data['type']
    elif 'updatedJob' in data and 'descriptionUpdated' in data:
        edit = True
                
    ### Insert Jobs ###
    ws.send(json.dumps({"type": "insert", "start": True}))
    new_ids = []
    
    try:
        q = Queue()
        if edit:
            t = threading.Thread(target=update_job, args=(data['updatedJob'], data['descriptionUpdated'], q))
        else:
            t = threading.Thread(target=insert_jobs, args=(jobs, source, q))
            
        t.start()
        
        # Stream updates from queue to WebSocket
        while True:
            update = q.get()  # blocking wait
            
            if "done" in update: # either entire operation is successful or something fails
                break 
            elif "id" in update: # 1 job is done
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
    except Exception as e:
        traceback.print_exc()
        ws.send(json.dumps({"type": "insert", "fail": True}))                
        ws.close()
        
    if edit and not data['descriptionUpdated']:
        ws.close()
    
    ### Recommend ###       
    ws.send(json.dumps({"type": "recommend", "start": True}))
    
    try:
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
        
        ws.send(json.dumps({"type": "recommend", "success": True}))                
    except Exception as e:
        traceback.print_exc()
        ws.send(json.dumps({"type": "recommend", "fail": True}))                
        ws.close()    

@app.route('/jobs', methods=['DELETE'])
def delete():
    try:
        job_id = flask.request.args.get('id', type=int)
        delete_job(job_id)
        return "Delete job success", 200
    except:
        return "Delete job failed", 500
    
    
@sock.route('/resumes')
def resumes_ws(ws):
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

if __name__ == '__main__':
    print("Python backend started")
    app.run(host="0.0.0.0", port=8080)