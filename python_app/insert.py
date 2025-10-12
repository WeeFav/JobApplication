from fastembed import TextEmbedding
import os
import psycopg2
import pandas as pd
import hashlib
from qdrant_client import QdrantClient, models
import uuid
import sys
from dotenv import load_dotenv
from typing import List, Dict

from preprocess_job import extract_description, canonicalize_url

load_dotenv()

conn = psycopg2.connect(
    host=os.environ["POSTGRES_HOST"],
    user=os.environ["POSTGRES_USER"],
    password=os.environ["POSTGRES_PASSWORD"],
    database=os.environ["POSTGRES_DB"],
    port=os.environ["POSTGRES_PORT"]
)
cursor = conn.cursor()

client = QdrantClient("http://qdrant:6333")
collection_name = "jobapplication"
model_name = "BAAI/bge-base-en-v1.5"

def insert(jobs: List[Dict], job_site):
    df = pd.DataFrame(jobs)
    description_extracted_list = [] # for label studio annotation
    
    for i in range(len(df)):
        # canonicalize url
        url_norm = canonicalize_url(df.iloc[i]['job_url'])
          
        # generate hash
        title_norm = df.iloc[i]['job_title'].strip().lower()
        company_norm = df.iloc[i]['company'].strip().lower()
        combined = title_norm + company_norm + url_norm
        hash = hashlib.sha256(combined.encode('utf-8')).hexdigest()

        # check if job exist
        cursor.execute("""
            SELECT * FROM jobs
            WHERE hash = %s
            """, 
            (hash,)
        )
        res = cursor.fetchall()
        
        if res:
            print(f"[!] Duplicate hash detected: {hash}, nothing inserted.")
            continue
        
        
        # extract description
        description = df.iloc[i]['job_description']
        if job_site == "Jobright":
            description_extracted = description
        else:
            description_extracted = extract_description(description)
        
        description_extracted_list.append(description_extracted)      
                
        # insert into postgres
        cursor.execute("""
            INSERT INTO jobs (hash, title, company, url, description, description_extracted) 
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING scrape_date
            """,
            (hash, df.iloc[i]['job_title'], df.iloc[i]['company'], url_norm, description, description_extracted)
        )
        conn.commit()
        
        scrape_date = cursor.fetchone()[0]
          
        # insert into qdrant
        point = models.PointStruct(
            id=str(uuid.uuid4()),
            vector=models.Document(text=description_extracted, model=model_name),
            payload={
                "hash": hash,
                "scrape_date": scrape_date
            }
        )
        
        client.upsert(
            collection_name=collection_name,
            points=[point]
        )
            
        print(f"processed job {i + 1}")
    
    return description_extracted_list
            