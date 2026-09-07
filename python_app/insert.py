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
from preprocess_job import extract_description, canonicalize_url, clean_html
import json

from scrape_ats_helper import get_db_connection

conn = None
cursor = None

client = QdrantClient("http://qdrant:6333")
collection_name = "jobapplication"
model_name = "BAAI/bge-base-en-v1.5"

def get_db():
    global conn, cursor
    try:
        if conn is None or conn.closed != 0:
            conn = get_db_connection()
            cursor = conn.cursor()
        return conn, cursor
    except Exception as e:
        print(f"Database connection error: {e}")
        raise e

def insert_jobs(jobs: List[Dict], job_site, ws=None, method='scrape'):
    if ws:
        ws.send(json.dumps({"type": "insert", "action": "start"}))
    print(f"got {len(jobs)} jobs from {job_site}")
    new_jobs = []

    db_conn, db_cursor = get_db()
    try:
        db_conn.rollback()
    except Exception:
        pass

    try:
        df = pd.DataFrame(jobs) 
        
        inserted_count = 0
        skipped_count = 0
        
        for i in range(len(df)):
            if ws:
                ws.send(json.dumps({
                    "type": "insert", 
                    "action": "postgres",
                    "inserted_count": inserted_count,
                    "skipped_count": skipped_count
                }))
            
            # canonicalize url
            url_norm = canonicalize_url(df.iloc[i]['url'])
            
            # generate hash
            title_norm = str(df.iloc[i]['title']).strip().lower()
            company_norm = str(df.iloc[i]['company']).strip().lower()
            combined = title_norm + company_norm + url_norm
            hash = hashlib.sha256(combined.encode('utf-8')).hexdigest()

            # check if job exist
            db_cursor.execute("""
                SELECT * FROM jobs
                WHERE hash = %s
                """, 
                (hash,)
            )
            res = db_cursor.fetchall()
            
            if res:
                print(f"[!] Duplicate hash detected: {hash}, nothing inserted.")
                skipped_count += 1
                if ws:
                    ws.send(json.dumps({
                        "type": "insert", 
                        "action": "skipped",
                        "inserted_count": inserted_count,
                        "skipped_count": skipped_count
                    }))
                continue
            
            # extract description
            description = clean_html(df.iloc[i]['description'])
            if job_site == "Jobright":
                description_extracted = description
            else:
                description_extracted = extract_description(description)
            print(f"description extracted, got {len(description_extracted)} characters")
                        
            # insert into postgres
            db_cursor.execute("""
                INSERT INTO jobs (hash, title, company, url, location, post_date, description, description_extracted, source, method) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, scrape_date
                """,
                (hash, df.iloc[i]['title'], df.iloc[i]['company'], url_norm, df.iloc[i]['location'], df.iloc[i]['post_date'], description, description_extracted, job_site, method)
            )
            db_conn.commit()
            print(f"inserted into postgres")
            
            if ws:
                ws.send(json.dumps({
                    "type": "insert", 
                    "action": "qdrant",
                    "inserted_count": inserted_count,
                    "skipped_count": skipped_count
                }))
            
            id, scrape_date = db_cursor.fetchone()
            
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
            inserted_count += 1
            if ws:
                ws.send(json.dumps({
                    "type": "insert", 
                    "action": "completed",
                    "inserted_count": inserted_count,
                    "skipped_count": skipped_count
                }))
            print(f"processed job {i + 1}")
            
        if ws:
            ws.send(json.dumps({"type": "insert", "action": "success"}))
        return new_jobs
    except Exception as e:
        try:
            db_conn.rollback()
        except Exception:
            pass
        traceback.print_exc()
        if ws:
            ws.send(json.dumps({"type": "insert", "action": "fail"}))
            ws.close()
        raise e
                       
def insert_resumes(data):
    db_conn, db_cursor = get_db()
    try:
        db_conn.rollback()
    except Exception:
        pass

    try:
        updatedResumes = data.get("updated", [])
        active_ids = data.get("active_ids", [])
        
        update_name = []
        update_all = []
        
        # split resume into name only update or full update
        for r in updatedResumes:
            if r.get("isContentUpdated", False):
                # resume with content updated or new resume
                update_all.append([r["id"], r["name"], r["content"], False])
            elif r.get("isNameUpdated", False):
                # name only update
                update_name.append((r["name"], r["id"]))

        print(f"got {len(update_name)} name only updates")
        print(f"got {len(update_all)} full updates")

        # compute embedding for full update
        if update_all:
            embedding_model = TextEmbedding(model_name=model_name)    
            embeddings = list(embedding_model.embed([r[2] for r in update_all]))
            for r, emb in zip(update_all, embeddings):
                r.append(emb.tolist())

            print(f"compute embedding for full update completed")
        
        # 1. Update name only
        if update_name:
            execute_batch(
                db_cursor,
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
                db_cursor,
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
        delete_query = """
        DELETE FROM resumes
        WHERE id NOT IN (SELECT UNNEST(%s::int[]))
        """

        db_cursor.execute(delete_query, (active_ids,))
        db_conn.commit()
        
        print(f"inserted into postgres")

        # return resumes that have full update
        return [{"id": r[0], "name": r[1], "content": r[2], "embedding": r[4]} for r in update_all]
    except Exception as e:
        try:
            db_conn.rollback()
        except Exception:
            pass
        print(f"Error in insert_resumes: {e}")
        raise e

def update_job(updatedJob, descriptionUpdated, ws):
    new_ids = []
    db_conn, db_cursor = get_db()
    try:
        db_conn.rollback()
    except Exception:
        pass

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
        db_cursor.execute("""
            UPDATE jobs
            SET hash = %s, title = %s, company = %s, url = %s, location = %s, post_date = %s, description = %s, description_extracted = %s
            WHERE id = %s
            """,
            (hash, updatedJob['title'], updatedJob['company'], url_norm, updatedJob['location'], updatedJob['post_date'], updatedJob['description'], description_extracted, updatedJob['id'])
        )
        db_conn.commit()
        
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
        try:
            db_conn.rollback()
        except Exception:
            pass
        print(e)
        raise e