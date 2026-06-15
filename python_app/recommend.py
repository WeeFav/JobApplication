from psycopg2.extras import execute_batch
import argparse
from fastembed import TextEmbedding
from qdrant_client import QdrantClient
from qdrant_client.models import NamedVector, SearchRequest, Filter, FieldCondition, Range, HasIdCondition, DatetimeRange, MatchValue
from datetime import datetime, timedelta
import os
import math
import psycopg2
from psycopg2.extras import execute_values
import spacy
from collections import defaultdict
import string
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
import json
import numpy as np
import ast
import traceback
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field
from typing import List
from sentence_transformers import SentenceTransformer
load_dotenv()

llm = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite",
    temperature=0,
)

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

class JobKeywords(BaseModel):
    educations: List[str] = Field(description="Education levels required or preferred. E.g., Bachelor’s Degree, Master’s, PhD")
    majors: List[str] = Field(description="Academic majors or fields of study required or preferred. E.g., Computer Engineering, Computer Science")
    skills: List[str] = Field(description="Technical skills, technologies, concepts, tools, and methodologies required or preferred. E.g., python, c, c++, Generative AI, llm, machine learning, pytorch, deep learning, real time operating systems (RTOS), UART, I2C")

EXTRACTION_PROMPT = """You are an expert recruiter and technical analyst.
Analyze the following job description and extract the requirements into three categories:

1. Educations: The level of education required or preferred. Examples include: Bachelor’s Degree, Master’s, PhD.
2. Majors: Academic fields of study or majors required or preferred. Examples include: Computer Engineering, Computer Science, Electrical Engineering, etc.
3. Skills: Technical skills, programming languages, technologies, concepts, tools, and methodologies. Examples include: python, c, c++, Generative AI, llm, machine learning, pytorch, deep learning, real time operating systems (RTOS), UART, I2C, etc.

Rules:
- Do NOT modify the original wording, only extract.
- Even if there is a typo or spelling error, preserve each character as is.
- Do not correct typos, do not standardize, and do not paraphrase.

Job Description:
{description}"""

conn = psycopg2.connect(
    host=os.environ["POSTGRES_HOST"],
    user=os.environ["POSTGRES_USER"],
    password=os.environ["POSTGRES_PASSWORD"],
    database=os.environ["POSTGRES_DB"],
    port=os.environ["POSTGRES_PORT"]
)
cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

client = QdrantClient("http://qdrant:6333")
collection_name = "jobapplication"
model_name = "BAAI/bge-base-en-v1.5"

ner_model = "ner_models/7_28"
nltk.download('stopwords')
stop_words = set(stopwords.words("english"))

# with open("skills_abbreviations.json", "r", encoding="utf-8") as f:
#     skills_abbreviations = json.load(f)
# with open("education_abbreviations.json", "r", encoding="utf-8") as f:
#     education_abbreviations = json.load(f)
    
def normalize(text: str, abbr):
    # lowercase
    text = text.lower()
    # remove punctuation
    text = text.translate(str.maketrans('', '', string.punctuation))
    
    # tokenize
    tokens = word_tokenize(text)
    nomralized_tokens = []
    for token in tokens:
        # expand abbreviation
        if token in abbr:
            token = abbr[token]
        # remove stop words
        if token in stop_words:
            continue
        nomralized_tokens.append(token)
    
    
    return " ".join(nomralized_tokens)    

def extract_keyword(description_extracted):
    if not description_extracted:
        return set(), set(), {}
        
    structured_llm = llm.with_structured_output(JobKeywords)
    result = structured_llm.invoke(EXTRACTION_PROMPT.format(description=description_extracted))
    
    educations = set(result.educations)
    majors = set(result.majors)
    skills = {skill: 1 for skill in result.skills}
    
    return educations, majors, skills

def embed_skills(skills: dict) -> dict:
    skills_list = list(skills.keys())
    
    cursor.execute(
        """
        SELECT skill, embedding
        FROM embedding
        WHERE skill = ANY(%s)
        """,
        (skills_list,)
    )
    rows = cursor.fetchall()
    
    embeddings = {}
    
    # cached skill embeddings
    for skill, embedding in rows:
        embeddings[skill] = np.array(json.loads(embedding), dtype=float)
        
    # compute missing skill embeddings
    missing_skills = [skill for skill in skills_list if skill not in embeddings]
    
    if missing_skills:
        new_embs = embedding_model.encode(missing_skills, normalize_embeddings=True)
        
        # Add to dict
        for skill, emb in zip(missing_skills, new_embs):
            embeddings[skill] = emb
                
        # Insert new embeddings into Postgres
        insert_values = [(skill, emb.tolist()) for skill, emb in zip(missing_skills, new_embs)]
        execute_batch(
            """
            INSERT INTO embeddings (skill, embedding) 
            VALUES (%s, %s) 
            ON CONFLICT (skill) DO NOTHING  
            """,
            insert_values       
        )
        conn.commit()
    
    return embeddings
    

def cosine_similarity_freq(resume, jd):
    """
    Frequency-based cosine similarity between two keyword dictionaries.
    Return between 0 and 1
    """
    all_keys = set(resume) | set(jd)
    dot = sum(resume.get(k, 0) * jd.get(k, 0) for k in all_keys) # dot product of the two vectors (where the vectors are keyword frequency counts)
    norm_r = math.sqrt(sum(v**2 for v in resume.values()))
    norm_j = math.sqrt(sum(v**2 for v in jd.values()))
    return dot / (norm_r * norm_j) if norm_r and norm_j else 0
    
    
def adjusted_jaccard(resume, jd):
    """
    Coverage-based weighted Jaccard similarity (resume coverage of JD keywords).
    Denominator is sum of JD frequencies (target).
    Intersection over union (IOU)
    """
    numerator = sum(min(resume.get(k, 0), jd.get(k, 0)) for k in jd)
    denominator = sum(jd.values())
    return numerator / denominator if denominator else 0


def compute_skill_embeddings_similarity(r_embeddings: dict, j_embeddings: dict, r_skills: dict, j_skills: dict):
    j_skills_list = list(j_embeddings.keys())
    r_skills_list = list(r_embeddings.keys())
    
    if len(j_skills_list) == 0:
        print("WRAN: job skill list empty!!! Skipping embedding score")
        return 0
    
    similarity_matrix = cos_sim([j_embeddings[skill].astype(np.float32) for skill in j_skills_list], [r_embeddings[skill].astype(np.float32) for skill in r_skills_list])
    
    total_weight = sum(j_skills.values())  # Normalization factor
    score_sum = 0

    for j, j_skill in enumerate(j_skills_list):
        # Best matching resume keyword
        best_match_score = 0
        for r, r_skill in enumerate(r_skills_list):
            sim = similarity_matrix[j][r]
            weighted_sim = sim * min(j_skills[j_skill], r_skills[r_skill]) # weighted by overlap frequency
            best_match_score = max(best_match_score, weighted_sim) # keep best match score
            
        # Weight by job keyword importance
        score_sum += best_match_score * j_skills[j_skill]

    final_score = score_sum / total_weight
    return final_score.item()             
    
    
def keyword_scoring(r_educations, r_majors, r_skills, r_embeddings, j_educations, j_majors, j_skills, j_embeddings):        
    # Normalized keyword match
    j_embeddings = embed_skills(j_skills)
    cosine_score = cosine_similarity_freq(r_skills, j_skills)
    jaccard_score = adjusted_jaccard(r_skills, j_skills)
    freq_score = (0.5 * cosine_score) + (0.5 * jaccard_score)    

    # Embedding similarity (pairwise similarity matrix using sentence_transformers.util.cos_sim)
    embed_score = compute_skill_embeddings_similarity(r_embeddings, j_embeddings, r_skills, j_skills)
    
    # Education match
    if len(j_educations) > 0 and len(j_educations.intersection(r_educations)) == 0:
        edu_score = 0
    else:
        edu_score = 1
        
    # Major match
    if len(j_majors) > 0 and len(j_majors.intersection(r_majors)) == 0:
        major_score = 0
    else:
        major_score = 1
    
    return freq_score, embed_score, edu_score, major_score


def recommend_by_job(new_jobs, ws):
    """Recommend caused by update in job"""
    ws.send(json.dumps({"type": "recommend", "start": True}))
    try:
        cursor.execute(f"""
            SELECT * FROM resumes
            """
        )
        resumes = cursor.fetchall()  
        
        # Extract job IDs from list of dicts
        job_ids = [job['id'] for job in new_jobs]
        
        for resume in resumes:
            # query new jobs by resume embedding and filter by score
            results = client.query_points(
                collection_name=collection_name,
                query=ast.literal_eval(resume['embedding']),
                query_filter=Filter(
                    must=[
                        HasIdCondition(has_id=job_ids)
                    ]
                ),
                score_threshold=0.5,
                limit=10_000_000,
                with_payload=True
            )
            
            recommended = {point.id: point.score for point in results.points}
            upsert_params = []
            delete_params = []

            if len(recommended) > 0:
                r_embeddings = embed_skills(resume['skills'])
            
            # evaluate every add/edit job
            for job in new_jobs:
                id = job['id']
                description_extracted = job['description_extracted']
                
                # if recommended
                if id in recommended:
                    j_educations, j_majors, j_skills = extract_keyword(description_extracted)
                    j_embeddings = embed_skills(j_skills)
                    
                    freq_score, embed_score, edu_score, major_score = keyword_scoring(resume["educations"], resume["majors"], resume["skills"], r_embeddings, j_educations, j_majors, j_skills, j_embeddings)
                    final_score = (0.4 *recommended[id]) + (0.2 * freq_score) + (0.3 * embed_score) + (0.05 * edu_score) + (0.05 * major_score)
                    upsert_params.append((id, resume['id'], freq_score, embed_score, edu_score, major_score, final_score))
                else:
                    # this delete is for when a job is edited and no longer meets the score threshold
                    delete_params.append((id, resume['id']))
            
            # upsert recommended
            if upsert_params:
                execute_values(
                    cursor,
                    """
                    INSERT INTO recommendations (job_id, resume_id, keyword_score, embeddings_score, education_score, major_score, final_score)
                    VALUES %s
                    """,
                    upsert_params
                )
            
            # delete non-recommended
            if delete_params:
                execute_values(
                    cursor,
                    """
                    DELETE FROM recommendations AS r
                    USING (VALUES %s) AS v(job_id, resume_id)
                    WHERE r.job_id = v.job_id AND r.resume_id = v.resume_id
                    """,
                    delete_params
                )                                  
            conn.commit()
            
        ws.send(json.dumps({"type": "recommend", "success": True}))
    except Exception as e:
        traceback.print_exc()
        ws.send(json.dumps({"type": "recommend", "fail": True}))
        ws.close()
        raise e
    
def recommend_by_resume(ids, ws):
    """Recommend caused by update in resume"""
    ws.send(json.dumps({"type": "recommend", "start": True}))
    try:
        # get resumes with updated embedding
        placeholders = ",".join(["%s"] * len(ids))
        try:
            cursor.execute(f"""
                SELECT * FROM resumes
                WHERE id IN ({placeholders})
                """,
                ids
            )
            updatedResumes = cursor.fetchall()
        except Exception as e:
            conn.rollback()
            raise e
            
        # search for all jobs with score > 0.5 up to 30 days ago
        thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat() # 30 days ago in Unix format
        print(f"Recommend jobs up to {thirty_days_ago}")
    
        for resume in updatedResumes:
            results = client.query_points(
                collection_name=collection_name,
                query=ast.literal_eval(resume['embedding']),
                query_filter=Filter(
                    must=[
                        FieldCondition(
                            key="scrape_date",
                            range=DatetimeRange(
                                gt=None,
                                gte=thirty_days_ago,
                                lt=None,
                                lte=None,
                            ),
                        ),
                        FieldCondition(
                            key="applied",
                            match=MatchValue(value=False)
                        )
                    ]
                ),
                score_threshold=0.5,
                limit=10_000_000,
                with_payload=True
            )
        
            print(f"Resume ID {resume['id']}")
            
            recommended = {point.id: point.score for point in results.points}
            upsert_params = []
            delete_params = []
            
            cursor.execute(f"""
                SELECT id FROM jobs
                """,
            )
            res = cursor.fetchall()
            
            ids = set([job['id'] for job in res])
            
            # evaluate every add/edit job
            for job_id in ids:
                # if recommended
                if job_id in recommended:
                    upsert_params.append((job_id, resume['id'], 0, 0, 0, 0, recommended[job_id]))
                else:
                    delete_params.append((job_id, resume['id']))
            
            # Stream updates to WebSocket
            ws.send(json.dumps({"type": "recommend", "update": True}))
            
            # upsert recommended                        
            if upsert_params:
                execute_values(
                    cursor,
                    """
                INSERT INTO recommendations (job_id, resume_id, similarity_score, keyword_score, embeddings_score, final_score)
                    VALUES %s
                ON CONFLICT (job_id, resume_id)
                DO UPDATE SET 
                    similarity_score = EXCLUDED.similarity_score,
                    keyword_score = EXCLUDED.keyword_score,
                    embeddings_score = EXCLUDED.embeddings_score,
                    final_score = EXCLUDED.final_score
                    """,
                    upsert_params
                )
            
            # delete non-recommended
            if delete_params:
                execute_values(
                    cursor,
                    """
                    DELETE FROM recommendations AS r
                    USING (VALUES %s) AS v(job_id, resume_id)
                    WHERE r.job_id = v.job_id AND r.resume_id = v.resume_id
                    """,
                    delete_params
                )                                  
            conn.commit()
            
        ws.send(json.dumps({"type": "recommend", "success": True}))
    except Exception as e:
        traceback.print_exc()
        ws.send(json.dumps({"type": "recommend", "fail": True}))
        ws.close()
        raise e
    
# [ScoredPoint(id=67, version=55, score=0.636933, payload={'scrape_date': 1764892800}, vector=None, shard_key=None, order_value=None), ScoredPoint(id=65, version=53, score=0.62863946, payload={'scrape_date': 1764892800}, vector=None, shard_key=None, order_value=None), ScoredPoint(id=66, version=54, score=0.6219132, payload={'scrape_date': 1764892800}, vector=None, shard_key=None, order_value=None), ScoredPoint(id=68, version=56, score=0.5946771, payload={'scrape_date': 1764892800}, vector=None, shard_key=None, order_value=None)]