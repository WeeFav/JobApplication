import flask
import json
import traceback
import time
from insert import insert

app = flask.Flask(__name__)

def scrape(message):
    print(message)
 
@app.route('/jobs', methods=['POST'])
def add_job():
    data = flask.request.json
    try:
        insert([data], 'manual')
        return flask.jsonify({"message": "success"}), 200
    except:
        return flask.jsonify({"message": "python insert failed"}), 500        

if __name__ == '__main__':
    print("Python backend started")
    app.run(host="0.0.0.0", port=8080)