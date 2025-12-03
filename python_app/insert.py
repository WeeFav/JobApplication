from fastembed import TextEmbedding
import os
import psycopg2
from psycopg2.extras import execute_batch
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

def insert_jobs(jobs: List[Dict], job_site, q):
    print(job_site)
    df = pd.DataFrame(jobs) 
    
    for i in range(len(df)):
        # canonicalize url
        url_norm = canonicalize_url(df.iloc[i]['url'])
          
        # generate hash
        title_norm = df.iloc[i]['title'].strip().lower()
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
        description = df.iloc[i]['description']
        if job_site == "Jobright":
            description_extracted = description
        else:
            description_extracted = extract_description(description)
                        
        # insert into postgres
        cursor.execute("""
            INSERT INTO jobs (hash, title, company, url, location, post_date, description, description_extracted) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, scrape_date
            """,
            (hash, df.iloc[i]['title'], df.iloc[i]['company'], url_norm, df.iloc[i]['location'], df.iloc[i]['post_date'], description, description_extracted)
        )
        conn.commit()
        
        id, scrape_date = cursor.fetchone()
          
        # insert into qdrant
        point = models.PointStruct(
            id=id,
            vector=models.Document(text=description_extracted, model=model_name),
            payload={
                "scrape_date": scrape_date
            }
        )
                
        client.upsert(
            collection_name=collection_name,
            points=[point]
        )
        
        q.put({"id": id})
        
        print(f"processed job {i + 1}")
    
    q.put({"done": True})
                       
def insert_resumes(updatedResumes):
    update_name = []
    update_all = []
    
    # split resume into name only update or full update
    for r in updatedResumes:
        if r["isUpdated"] == False:
            update_name.append((r["name"], r["id"]))
        else:
            update_all.append([r["id"], r["name"], r["content"], False])

    # compute embedding for full update
    embedding_model = TextEmbedding(model_name=model_name)    
    embeddings = list(embedding_model.embed([r[2] for r in update_all]))
    for r, emb in zip(update_all, embeddings):
        r.append(emb.tolist())
    
    # 1. Update name only
    if update_name:
        execute_batch(
            cursor,
            """
            UPDATE resumes
            SET name = %s
            WHERE id = %s
            """,
            update_name
        )
        
    # 2. Update full
    if update_all:
        execute_batch(
            cursor,
            """
            INSERT INTO resumes (id, name, content, isUpdated, embedding)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id)
            DO UPDATE SET
                name = EXCLUDED.name,
                content = EXCLUDED.content,
                isUpdated = EXCLUDED.isUpdated,
                embedding = EXCLUDED.embedding
            """,
            update_all
        )        

    # 3. Delete rows not in current resumes
    ids = [r["id"] for r in updatedResumes]

    delete_query = """
    DELETE FROM resumes
    WHERE id NOT IN (SELECT UNNEST(%s::int[]))
    """

    cursor.execute(delete_query, (ids,))
    conn.commit()
    
    return [r[0] for r in update_all]