from fastembed import TextEmbedding
import os
import psycopg2
from psycopg2.extras import execute_batch
import pandas as pd
import hashlib
from qdrant_client import QdrantClient, models
import uuid
import sys
import traceback
from dotenv import load_dotenv
from typing import List, Dict
from datetime import datetime
from preprocess_job import extract_description, canonicalize_url
import json

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

def insert_jobs(jobs: List[Dict], job_site, ws):
    ws.send(json.dumps({"type": "insert", "action": "start"}))
    print(f"got {len(jobs)} jobs from {job_site}")
    new_jobs = []

    try:
        df = pd.DataFrame(jobs) 
        
        for i in range(len(df)):
            ws.send(json.dumps({"type": "insert", "action": "postgres"}))
            
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
            print(f"description extracted, got {len(description_extracted)} characters")
                        
            # insert into postgres
            cursor.execute("""
                INSERT INTO jobs (hash, title, company, url, location, post_date, description, description_extracted) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, scrape_date
                """,
                (hash, df.iloc[i]['title'], df.iloc[i]['company'], url_norm, df.iloc[i]['location'], df.iloc[i]['post_date'], description, description_extracted)
            )
            conn.commit()
            print(f"inserted into postgres")
            
            ws.send(json.dumps({"type": "insert", "action": "qdrant"}))
            
            id, scrape_date = cursor.fetchone()
            
            # insert into qdrant  
            point = models.PointStruct(
                id=id,
                vector=models.Document(text=description_extracted, model=model_name),
                payload={
                    "scrape_date": scrape_date.isoformat(),
                    "applied": False,
                }
            )
                    
            client.upsert(
                collection_name=collection_name,
                points=[point]
            )
            print(f"inserted into qdrant")
            
            new_jobs.append({"id": id, "description_extracted": description_extracted})
            ws.send(json.dumps({"type": "insert", "action": "completed"}))
            print(f"processed job {i + 1}")
            
        ws.send(json.dumps({"type": "insert", "action": "success"}))
        return new_jobs
    except Exception as e:
        traceback.print_exc()
        ws.send(json.dumps({"type": "insert", "action": "fail"}))
        ws.close()
        raise e
                       
def insert_resumes(updatedResumes):
    update_name = []
    update_all = []
    
    # split resume into name only update or full update
    for r in updatedResumes:
        if r["isUpdated"] == False:
            update_name.append((r["name"], r["id"]))
        else:
            # resume with content updated or new resume will have isUpdated = True
            update_all.append([r["id"], r["name"], r["content"], False])

    print(f"got {len(update_name)} name only updates")
    print(f"got {len(update_all)} full updates")

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
    
    print(f"inserted into postgres")

    # return resumes that have full update
    return [{"id": r[0], "name": r[1], "content": r[2], "embedding": r[4]} for r in update_all]

def update_job(updatedJob, descriptionUpdated, ws):
    new_ids = []
    try:
        ws.send(json.dumps({"type": "insert", "action": "postgres"}))
        
        # canonicalize url
        url_norm = canonicalize_url(updatedJob['url'])
        
        # generate hash
        title_norm = updatedJob['title'].strip().lower()
        company_norm = updatedJob['company'].strip().lower()
        combined = title_norm + company_norm + url_norm
        hash = hashlib.sha256(combined.encode('utf-8')).hexdigest()

        # extract description
        if descriptionUpdated:
            description_extracted = extract_description(updatedJob['description'])
        else:
            description_extracted = updatedJob['description_extracted']
                    
        # insert into postgres
        cursor.execute("""
            UPDATE jobs
            SET hash = %s, title = %s, company = %s, url = %s, location = %s, post_date = %s, description = %s, description_extracted = %s
            WHERE id = %s
            """,
            (hash, updatedJob['title'], updatedJob['company'], url_norm, updatedJob['location'], updatedJob['post_date'], updatedJob['description'], description_extracted, updatedJob['id'])
        )
        conn.commit()
        
        if descriptionUpdated:
            ws.send(json.dumps({"type": "insert", "action": "qdrant"}))
            point = models.PointStruct(
                id=updatedJob['id'],
                vector=models.Document(text=description_extracted, model=model_name),
                payload={
                    "scrape_date": datetime.strptime(updatedJob['scrape_date'], "%Y-%m-%dT%H:%M:%S.%fZ").date().isoformat()
                }
            )
                    
            client.upsert(
                collection_name=collection_name,
                points=[point]
            )
            new_ids.append(updatedJob['id'])
            ws.send(json.dumps({"type": "insert", "action": "update"}))
        
        return new_ids
    except Exception as e:
        print(e)
        raise e