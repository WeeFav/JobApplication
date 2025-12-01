import flask
from flask_sock import Sock
import json
import traceback
import time
import requests
import threading
from queue import Queue
from insert import insert_jobs, insert_resumes
from linkedin import scrape_linkedin
from recommend import recommend_by_job, recommend_by_resume

app = flask.Flask(__name__)
sock = Sock(app)
 
@sock.route('/jobs')
def jobs_ws(ws):
    raw = ws.receive()
    data = json.loads(raw)
    
    ### Scrape Jobs ###
    if 'jobsite' in data and 'numJobs' in data:
        ws.send(json.dumps({"type": "scrape", "start": True}))
        
        jobs = []
        source = data['jobsite']
        
        try:
            q = Queue()
            t = threading.Thread(target=scrape_linkedin, args=(data['numJobs'], q))
            t.start()
            
            # Stream updates from queue to WebSocket
            while True:
                update = q.get()  # blocking wait
                if "done" in update:
                    break
                jobs.append(update)
                ws.send({"type": "scrape", "update": True}) 
            
            ws.send(json.dumps({"type": "scrape", "success": True}))                
        except Exception as e:
            traceback.print_exc()
            ws.send(json.dumps({"type": "scrape", "success": False}))                
            ws.close()    
    ### Get Jobs ###
    elif 'newJobs' in data and 'type' in data:
        jobs = data['newJobs']
        source = data['type']
    
    ### Insert Jobs ###
    ws.send(json.dumps({"type": "insert", "start": True}))
    new_ids = []
    
    try:
        q = Queue()
        t = threading.Thread(target=insert_jobs, args=(jobs, source, q))
        t.start()
        
        # Stream updates from queue to WebSocket
        while True:
            update = q.get()  # blocking wait
            if "done" in update:
                break
            new_ids.append(update)
            ws.send({"type": "insert", "update": True}) 
        
        ws.send(json.dumps({"type": "insert", "success": True}))                
    except Exception as e:
        traceback.print_exc()
        ws.send(json.dumps({"type": "insert", "success": False}))                
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
            if "done" in update:
                break
            ws.send({"type": "recommend", "update": True}) 
        
        ws.send(json.dumps({"type": "recommend", "success": True}))                
    except Exception as e:
        traceback.print_exc()
        ws.send(json.dumps({"type": "recommend", "success": False}))                
        ws.close()    
    
@sock.route('/resumes')
def resumes_ws(ws):
    raw = ws.receive()
    updatedResumes = json.loads(raw)
    
    ### Insert Resume ###
    ws.send(json.dumps({"type": "insert", "start": True}))
    
    try:
        insert_resumes(updatedResumes)        
        ws.send(json.dumps({"type": "insert", "success": True}))                
    except Exception as e:
        traceback.print_exc()
        ws.send(json.dumps({"type": "insert", "success": False}))                
        ws.close()
    
    ### Recommend ###
    ws.send(json.dumps({"type": "recommend", "start": True}))
    
    try:
        q = Queue()
        t = threading.Thread(target=recommend_by_resume, args=(updatedResumes, q))
        t.start()
        
        # Stream updates from queue to WebSocket
        while True:
            update = q.get()  # blocking wait
            if "done" in update:
                break
            ws.send({"type": "recommend", "update": True}) 
        
        ws.send(json.dumps({"type": "recommend", "success": True}))                
    except Exception as e:
        traceback.print_exc()
        ws.send(json.dumps({"type": "recommend", "success": False}))                
    
    ws.close()

if __name__ == '__main__':
    print("Python backend started")
    app.run(host="0.0.0.0", port=8080)