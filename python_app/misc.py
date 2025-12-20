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
from datetime import datetime
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

def delete_job(job_id):
    # delete from db
    cursor.execute("""
        DELETE FROM jobs 
        WHERE id = %s
        """,
        (job_id,)
    )
    conn.commit()
    
    # delete from qdrant
    client.delete(
        collection_name=collection_name,
        points_selector=[job_id]
    )    
    
def add_application(job_id):
    cursor.execute("""
        INSERT INTO applications (job_id)
        VALUES (%s)
        """,
        (job_id,)
    )
    conn.commit()
    
    client.set_payload(
        collection_name=collection_name,
        payload={
            "applied": True,
        },
        points=[job_id],
    )
        
def delete_application(job_id):
    cursor.execute("""
        DELETE FROM applications
        WHERE job_id = %s
        """,
        (job_id,)
    )
    conn.commit()
    
    client.set_payload(
        collection_name=collection_name,
        payload={
            "applied": False,
        },
        points=[job_id],
    )

def system_check():
    cursor.execute("""
        SELECT id, scrape_date FROM jobs
        """,
    )
    jobs = cursor.fetchall()
    pg_dict = {job[0]: job[1] for job in jobs}
    
    all_points = []
    offset = None

    while True:
        result = client.scroll(
            collection_name=collection_name,
            scroll_filter=None,
            limit=1000,
            offset=offset,
            with_payload=True,
            with_vectors=False
        )
        points, offset = result
        all_points.extend(points)

        if offset is None:
            break
        
    qdrant_dict = {point.id: point.payload.get("scrape_date") for point in all_points}
    
    # 1. IDs in Postgres but not Qdrant
    in_pg_not_qdrant = set(pg_dict.keys()) - set(qdrant_dict.keys())

    # 2. IDs in Qdrant but not Postgres
    in_qdrant_not_pg = set(qdrant_dict.keys()) - set(pg_dict.keys())

    # 3. IDs where scrape_date mismatches
    mismatched_scrape_dates = [
        job_id for job_id in pg_dict.keys() & qdrant_dict.keys()
        if pg_dict[job_id] != qdrant_dict[job_id]
    ]
    
    # print("In Postgres but not Qdrant:", in_pg_not_qdrant)
    # print("In Qdrant but not Postgres:", in_qdrant_not_pg)
    # print("Scrape date mismatches:", mismatched_scrape_dates)
    
    return in_pg_not_qdrant, in_qdrant_not_pg, mismatched_scrape_dates
    