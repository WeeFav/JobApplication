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
import argparse

# set enviroment variables
load_dotenv()

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

def call_LLM(jd):
  messages = [HumanMessage(f"""
                         Extract all qualifications and skills needed for this job. Use the exact same word as on the original post. Output nothing else but the bullet points.
                         
                         {jd}
                         """)]
  res = model_LLM.invoke(messages)
  return res

def dump_vector_store(vector_store):
  print("dumping vector store...")
  documents = vector_store._collection.get()
  ids = documents["ids"]  # List of IDs
  texts = documents["documents"]  # List of texts
  print(f"vector store currently have {vector_store._collection.count()} documents")
  df = pd.DataFrame({'job_id': ids, 'job_description': texts})
  df.to_csv(f"./chroma_db/{vector_store._collection_name}.csv", index=False)

def extract_skills(job_list):
  extracted_skill_list = []
  id_list = []
  
  # extract all job description
  for idx, job in enumerate(job_list):
    print(f"extracting job {job['job_id']} | {idx+1}/{len(job_list)}")
    skill = call_LLM(job['job_description'])
    skill = "\n".join([x[2:] for x in skill.splitlines()]) # remove bullet point generated by LLM
    extracted_skill_list.append(skill)
    id_list.append(str(job['job_id']))
    
    cursor.execute(f"""
                    UPDATE jobs
                    SET job_extracted_skill = "{skill}" 
                    WHERE job_id = {job['job_id']};
                    """)
    db.commit()

    # let machine cool down
    for i in range(6, -1, -1):
      print(f"cooling down... {i}", end=' \r')
      time.sleep(1)
    print('')
  
  return extracted_skill_list, id_list
  
def recommend():
  cursor.execute("""
                 SELECT user_id, user_education, user_skills, user_experience_years, user_experience_roles FROM users
                 WHERE user_education IS NOT NULL OR user_skills IS NOT NULL OR user_experience_roles IS NOT NULL
                 """)
  user_profile_list = cursor.fetchall()
    
  for user in user_profile_list:
    text = ""
    if user['user_education'] is not None:
      text += f"{user['user_education']}\n"
    if user['user_skills'] is not None:
      skills = json.loads(user['user_skills'])
      skills = ", ".join(skills)
      text += f"{skills}\n"
    if user['user_experience_years'] is not None:
      text += f"{user['user_experience_years']} years of experience\n"
    if user['user_experience_roles'] is not None:
      roles = json.loads(user['user_experience_roles'])
      roles = ", ".join(roles)
      text += f"{roles}"
      
    results = vector_store.similarity_search(text, k=3)
    # print(user['user_id'], [x.id for x in results])

    # update recommend table
    
    cursor.execute(f"""
                   DELETE FROM recommendations WHERE user_id = {int(user['user_id'])} AND job_id NOT IN {str(tuple([int(x.id) for x in results]))};
                   """)
    db.commit()
    cursor.execute(f"""
                   INSERT INTO recommendations (user_id, job_id)
                   VALUES {", ".join([str((int(user['user_id']), int(x.id))) for x in results])};
                   """)
    db.commit()  

def synchronize():
  cursor.execute("""
                 SELECT job_id, job_description FROM jobs
                 WHERE job_extracted_skill is NULL;
                 """)
  job_list = cursor.fetchall()
  
  extract_skills(job_list) 
  
  cursor.execute("""
                 SELECT job_id FROM jobs
                 """)
  all_job_ids = [job['job_id'] for job in cursor.fetchall()]
  current_job_ids_in_vector = vector_store.get()['ids']
  job_ids = list(set(all_job_ids) - set([int(x) for x in current_job_ids_in_vector]))
  
  print(f"found {len(job_ids)} jobs not in vector store")
  
  cursor.execute(f"""
                 SELECT job_id, job_extracted_skill FROM jobs
                 WHERE job_id in {tuple(job_ids)}
                 """)
  job_list = cursor.fetchall()
  extracted_skill_list = [job['job_extracted_skill'] for job in job_list]
  id_list = [job['job_id'] for job in job_list]
  
  # vectorize
  print("vectorizing...")
  vector_store.add_texts(texts=extracted_skill_list, ids=id_list)
  
  dump_vector_store(vector_store)

def main():
  wait_next_data = True
  print("Python Server Runinng...")
  
  while True:
    if wait_next_data:
      print("waiting on data...")
    result = r.brpop('queue', timeout=5)
    if result:
      print("recieved data")
      _, data = result
      job_list = json.loads(data) # list of dicts with keys ['job_id', 'job_description']
      
      extracted_skill_list, id_list = extract_skills(job_list) 
      
      # vectorize
      print("vectorizing...")
      vector_store.add_texts(texts=extracted_skill_list, ids=id_list)
      
      dump_vector_store(vector_store)
     
      wait_next_data = True
    else:
      wait_next_data = False
    
if __name__ == '__main__':
  parser = argparse.ArgumentParser()
  parser.add_argument("--reset", action="store_true", help="Reset vector store")
  parser.add_argument("--recommend", action="store_true", help="Recommend jobs to user")
  parser.add_argument("--sync", action="store_true", help="Synchronize jobs in mysql database with vectore store")
  args = parser.parse_args()
  
  if args.reset:
    vector_store.reset_collection()
    print("Reset vector store")
  elif args.recommend:
    # # compute similarity
    # print("recommending...")
    # results = vector_store.similarity_search("artificial intelligence, software engineer", k=10)
    # print([x.id for x in results])
    recommend()
  elif args.sync:
    synchronize()
  else:
    main()