import flask
import json
import traceback
import time
import requests
from insert import insert
from linkedin import scrape_linkedin
from recommend import resume_recommendations, job_recommendations

app = flask.Flask(__name__)

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

@app.route('/scrape', methods=['POST'])
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

if __name__ == '__main__':
    print("Python backend started")
    app.run(host="0.0.0.0", port=8080)