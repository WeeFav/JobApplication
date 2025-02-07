import pandas as pd
import numpy as np
from langchain_ollama.llms import OllamaLLM
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv
import redis
import json
import os
import time
import mysql.connector
from langchain_chroma import Chroma
import chromadb
from langchain_ollama import OllamaEmbeddings
load_dotenv()

def extract_skill(jd):
  messages = [HumanMessage(f"""
                         Extract all qualifications and skills needed for this job. Use the exact same word as on the original post. Output nothing else but the bullet points.
                         
                         {jd}
                         """)]
  res = model_LLM.invoke(messages)
  return res

def dump_vector_store(vector_store):
  documents = vector_store._collection.get()
  ids = documents["ids"]  # List of IDs
  texts = documents["documents"]  # List of texts
  print(vector_store._collection.count())
  df = pd.DataFrame({'job_id': ids, 'job_description': texts})
  df.to_csv(f"./chroma_db/{vector_store._collection_name}.csv", index=False)

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
model_LLM = OllamaLLM(model="llama3.2")
model_emb = OllamaEmbeddings(model="nomic-embed-text")
# setup vector store
chroma_client = chromadb.PersistentClient("./chroma_db")
vector_store = Chroma(
    client=chroma_client,
    collection_name="jd_collection",
    embedding_function=model_emb
)
vector_store.reset_collection()

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
    id_list = []
    
    # extract all job description
    for idx, job in enumerate(jd_list):
      print(f"extracting job {job['job_id']} | {idx+1}/{len(jd_list)}")
      skill = extract_skill(job['job_description'])
      skill = "\n".join([x[2:] for x in skill.splitlines()])
      extracted_skill_list.append(skill)
      id_list.append(str(job['job_id']))
      
      # let machine cool down
      for i in range(4, -1, -1):
        print(f"cooling down... {i}", end=' \r')
        time.sleep(1)
      print('')
    
    updates = []
    for i in range(len(extracted_skill_list)):
      updates.append(f"""WHEN job_id = {id_list[i]} THEN "{extracted_skill_list[i]}" """)  
    updates = "\n".join(updates)
    job_id_list = "(" + ", ".join(id_list) + ")"
    
    print("updating database...")
    cursor.execute(f"""
                   UPDATE jobs
                   SET job_extracted_skill = CASE 
                   {updates}
                   END
                   WHERE job_id IN {job_id_list};
                   """)
    db.commit()
    
    # vectorize
    print("vectorizing...")
    vector_store.add_texts(texts=extracted_skill_list, ids=id_list)
    
    # compute similarity
    print("recommending...")
    results = vector_store.similarity_search("risk mangement", k=3)
    print([x.id for x in results])
    dump_vector_store(vector_store)
    
    wait_next_data = True
  else:
    wait_next_data = False