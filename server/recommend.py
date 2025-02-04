import pandas as pd
import numpy as np
from langchain_ollama.llms import OllamaLLM
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv
import re
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
import nltk
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import redis
import json
import os
import time
import mysql.connector
load_dotenv()

def extract_skill(jd):
  messages = [HumanMessage(f"""
                         Extract all qualifications and skills needed for this job. Use the exact same word as on the original post. Output nothing else but the bullet points.
                         
                         {jd}
                         """)]
  res = model.invoke(messages)
  return res

# connect to redis
r = redis.Redis(
    host=os.environ['REDIS_HOST'],
    port=os.environ['REDIS_PORT'],
    decode_responses=True,
    username=os.environ['REDIS_USER'],
    password=os.environ['REDIS_PASSWORD'],
)

# connect to mysql
db = mysql.connector.connect(
    host=os.environ['DB_HOST'],       
    user=os.environ['DB_USER'],            
    password=os.environ['DB_PASSWORD'],    
    database=os.environ['DB_NAME']      
)
cursor = db.cursor(dictionary=True)

# setup LLM
model = OllamaLLM(model="llama3.2")
# define stop words
stop_words = stopwords.words('english')
additional_stop_words = ['experience', 'qualification', 'working', 'skill']
stop_words.extend(additional_stop_words)
# setup tfidf
vectorizer = TfidfVectorizer()

print("Python Server Runinng...")

wait_next_data = True

while True:
  if wait_next_data:
    print("waiting on data...")
  result = r.brpop('queue', timeout=5)
  if result:
    print("recieved data")
    _, data = result
    jd_list = json.loads(data)
    extracted_skill_list = []
    
    # extract all job description
    for idx, job in enumerate(jd_list):
      print(f"extracting job {job['job_id']} | {idx+1}/{len(jd_list)}")
      skill = extract_skill(job['job_description'])
      # lowercase
      skill = skill.lower()
      # remove punctuation
      skill = re.sub(r'[^\w\s]', '', skill)
      # remove stop words
      skill = skill.split()
      tokens = [word for word in skill if word not in stop_words]
      # lemmatize
      lemmatizer = WordNetLemmatizer()
      tokens = [lemmatizer.lemmatize(word) for word in tokens]
      # reconsturct
      skill = " ".join(tokens)

      extracted_skill_list.append({'job_id': job['job_id'],
                          'skill': skill})
      # let machine cool down
      for i in range(4, -1, -1):
        print(f"cooling down... {i}", end=' \r')
        time.sleep(1)
      print('')
    
    updates = "\n".join([f"WHEN job_id = {x['job_id']} THEN '{x['skill']}'" for x in extracted_skill_list])
    job_id_list = "(" + ", ".join([str(x['job_id'] )for x in extracted_skill_list]) + ")"
    print("updating database...")
    cursor.execute(f"""
                   UPDATE jobs
                   SET job_extracted_skill = CASE 
                   {updates}
                   END
                   WHERE job_id IN {job_id_list};
                   """)
    db.commit()
    
    wait_next_data = True
  else:
    wait_next_data = False
        
corpus = np.load("./server/corpus.npy", allow_pickle=True)
vectorizer = TfidfVectorizer()
tfidf_matrix = vectorizer.fit_transform(corpus)

# Example user input
user_input = ["computer vision pytorch", "program management experience", "master degree engineering"]
user_vector = vectorizer.transform(user_input)

# Compute cosine similarity
similarity_scores = cosine_similarity(user_vector, tfidf_matrix)
# print(similarity_scores.argsort()[:,-1:])
print(similarity_scores.argsort())
