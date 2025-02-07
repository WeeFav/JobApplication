import pandas as pd
import numpy as np
from langchain_ollama import OllamaEmbeddings
from dotenv import load_dotenv
from sklearn.metrics.pairwise import cosine_similarity
import redis
import json
import os
import time
import mysql.connector
from langchain_chroma import Chroma
import chromadb
load_dotenv()

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

# setup LLM
embeddings = OllamaEmbeddings(model="nomic-embed-text")

# setup vector store
chroma_client = chromadb.PersistentClient("./chroma_db")
vector_store = Chroma(
    client=chroma_client,
    collection_name="jd_collection",
    embedding_function=embeddings
)

# vector_store.reset_collection()

print("Python Server Runinng...")

wait_next_data = True

while True:
  if wait_next_data:
    print("waiting on data...")
    
  result = r.brpop('queue', timeout=5)
  
  if result:
    print("recieved data")
    _, data = result
    data = json.loads(data)
    jd_list = [job['job_description'] for job in data]
    id_list = [str(job['job_id']) for job in data]
        
    vector_store.add_texts(texts=jd_list, ids=id_list)
    results = vector_store.similarity_search("hardware firmware", k=2)
    print([x.id for x in results])
    dump_vector_store(vector_store)
    
    wait_next_data = True
  else:
    wait_next_data = False
    
    

num_items = vector_store._collection.count()
print(num_items)
for res in results:
  print(res)


