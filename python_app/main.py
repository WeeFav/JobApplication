import flask
from flask_sock import Sock
import json
import traceback
import time
import requests
import threading
from queue import Queue
from insert import insert
from linkedin import scrape_linkedin
from recommend import resume_recommendations, job_recommendations

app = flask.Flask(__name__)
sock = Sock(app)

def scrape(message):
    print(message)
 
@app.route('/jobs', methods=['POST'])
def add_job():
    data = flask.request.json
    try:
        new_ids = insert(data["newJobs"], data["type"])
        return flask.jsonify(new_ids), 200
    except Exception as e:
        traceback.print_exc()
        return flask.jsonify({"message": "python insert failed"}), 500        

def scrape():
    scrapeInfo = flask.request.json
    try:
        jobs = scrape_linkedin(scrapeInfo['numJobs'])
        return flask.jsonify(jobs), 200
    except Exception as e:
        traceback.print_exc()
        return flask.jsonify({"message": "python scrape failed"}), 500

@app.route('/recommend/job', methods=['POST'])
def recommend_job():
    new_ids = flask.request.json
    try:
        job_recommendations(new_ids)
        return flask.jsonify({"message": "python recommend success"}), 200
    except Exception as e:
        traceback.print_exc()
        return flask.jsonify({"message": "python recommend failed"}), 500

@app.route('/recommend/resume', methods=['POST'])
def recommend_resume():
    new_ids = flask.request.json
    try:
        resume_recommendations(new_ids)
        return flask.jsonify({"message": "python recommend success"}), 200
    except Exception as e:
        traceback.print_exc()
        return flask.jsonify({"message": "python recommend failed"}), 500

@sock.route('/jobs')
def jobs_ws(ws):
    raw = ws.receive()
    data = json.loads(raw)
    
    # scrape
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
            ws.send(json.dumps({"type": "scrape", "success": False}))                
            ws.close()
        
    # get job
    elif 'newJobs' in data and 'type' in data:
        jobs = data['newJobs']
        source = data['type']
    
    # insert jobs
    
    
@sock.route('/resumes')
def resumes_ws(ws):
    ws.receive()

if __name__ == '__main__':
    print("Python backend started")
    app.run(host="0.0.0.0", port=8080)