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
from sentence_transformers.util import cos_sim
load_dotenv()

llm = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite",
    temperature=0,
)

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

class JobKeywords(BaseModel):
    majors: List[str] = Field(description="Academic majors or fields of study required or preferred. E.g., Computer Engineering, Computer Science")
    skills: List[str] = Field(description="Technical skills, technologies, concepts, tools, and methodologies required or preferred. E.g., python, c, c++, Generative AI, llm, machine learning, pytorch, deep learning, real time operating systems (RTOS), UART, I2C")

EXTRACTION_PROMPT = """You are an expert recruiter and technical analyst.
Analyze the following job description and extract the requirements into two categories:

1. Majors: Academic fields of study or majors required or preferred. Examples include: Computer Engineering, Computer Science, Electrical Engineering, etc.
2. Skills: Technical skills, programming languages, technologies, concepts, tools, and methodologies. Examples include: python, c, c++, Generative AI, llm, machine learning, pytorch, deep learning, real time operating systems (RTOS), UART, I2C, etc.

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

nltk.download('stopwords')
nltk.download('punkt_tab')
stop_words = set(stopwords.words("english"))

with open("skills_abbreviations.json", "r", encoding="utf-8") as f:
    skills_abbreviations = json.load(f)
with open("education_abbreviations.json", "r", encoding="utf-8") as f:
    education_abbreviations = json.load(f)
    
def normalize(text: str, abbr):
    # lowercase
    text = text.lower()
    # protect c++ and c#
    text = text.replace("c++", "cplusplus").replace("c#", "csharp")
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
        return set(), {}, set()
        
    print("extracting keyword")
    
    structured_llm = llm.with_structured_output(JobKeywords)
    result = structured_llm.invoke(EXTRACTION_PROMPT.format(description=description_extracted))
    
    # Merge abbreviations
    abbr = {**skills_abbreviations, **education_abbreviations}
    
    # Normalize description
    normalized_desc = normalize(description_extracted, abbr)
    desc_tokens = normalized_desc.split()

    # Normalize majors
    majors = set()
    for major in result.majors:
        norm_major = normalize(major, abbr)
        if norm_major:
            majors.add(norm_major)
            
    # Normalize and count skills in description_extracted
    skills = {}
    for skill in result.skills:
        normalized_skill = normalize(skill, abbr)
        if not normalized_skill:
            continue
        
        skill_tokens = normalized_skill.split()
        count = 0
        n = len(skill_tokens)
        if n > 0:
            for i in range(len(desc_tokens) - n + 1):
                if desc_tokens[i:i+n] == skill_tokens:
                    count += 1
        
        skills[normalized_skill] = max(count, 1)
        
    return majors, skills, set(result.skills)

def embed_skills(skills: dict) -> dict:
    print("embedding skills")

    skills_list = list(skills.keys())
    
    cursor.execute(
        """
        SELECT skill, embedding
        FROM embeddings
        WHERE skill = ANY(%s)
        """,
        (skills_list,)
    )
    rows = cursor.fetchall()
    
    embeddings = {}
    
    # cached skill embeddings
    for skill, embedding in rows:
        if embedding.startswith('{') and embedding.endswith('}'):
            emb_list = [float(x) for x in embedding[1:-1].split(',')]
        else:
            emb_list = json.loads(embedding)
        embeddings[skill] = np.array(emb_list, dtype=float)
        
    # compute missing skill embeddings
    missing_skills = [skill for skill in skills_list if skill not in embeddings]
    
    if missing_skills:
        new_embs = embedding_model.encode(missing_skills, normalize_embeddings=True)
        
        # Add to dict
        for skill, emb in zip(missing_skills, new_embs):
            embeddings[skill] = emb
                
        # Insert new embeddings into Postgres
        insert_values = [(skill, json.dumps(emb.tolist())) for skill, emb in zip(missing_skills, new_embs)]
        execute_batch(
            cursor,
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
    
    
def keyword_scoring(r_majors, r_skills, r_embeddings, j_majors, j_skills, j_embeddings):        
    print("calculating keyword scores")
    
    # Normalized keyword match
    cosine_score = cosine_similarity_freq(r_skills, j_skills)
    jaccard_score = adjusted_jaccard(r_skills, j_skills)
    freq_score = (0.5 * cosine_score) + (0.5 * jaccard_score)    

    # Embedding similarity (pairwise similarity matrix using sentence_transformers.util.cos_sim)
    embed_score = compute_skill_embeddings_similarity(r_embeddings, j_embeddings, r_skills, j_skills)
        
    # Major match
    if len(j_majors) > 0 and len(j_majors.intersection(r_majors)) == 0:
        major_score = 0
    else:
        major_score = 1
    
    return freq_score, embed_score, major_score


def recommend_by_job(new_jobs, ws):
    """Recommend caused by update in job"""
    ws.send(json.dumps({"type": "recommend", "action": "start"}))
    print(f"got {len(new_jobs)} to recommend")

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
                query=ast.literal_eval(resume['embedding']) if isinstance(resume['embedding'], str) else resume['embedding'],
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

            print(f"{resume['name']} have {len(recommended)} recommended jobs")

            if len(recommended) > 0:
                r_embeddings = embed_skills(resume['skills'])
            
            # evaluate every add/edit job
            for job in new_jobs:
                id = job['id']
                description_extracted = job['description_extracted']
                
                # if recommended
                if id in recommended:
                    j_majors, j_skills, j_raw_skills = extract_keyword(description_extracted)
                    cursor.execute("""
                        UPDATE jobs
                        SET majors = %s, skills = %s, raw_skills = %s
                        WHERE id = %s
                    """, (list(j_majors), json.dumps(j_skills), list(j_raw_skills), id))

                    j_embeddings = embed_skills(j_skills)
                    
                    r_majors = set(resume["majors"]) if resume["majors"] else set()
                    r_skills = resume["skills"] if resume["skills"] else {}
                    
                    freq_score, embed_score, major_score = keyword_scoring(
                        r_majors, r_skills, r_embeddings,
                        j_majors, j_skills, j_embeddings
                    )
                    final_score = (0.4 * recommended[id]) + (0.2 * freq_score) + (0.3 * embed_score) + (0.1 * major_score)
                    upsert_params.append((id, resume['id'], recommended[id], freq_score, embed_score, major_score, final_score))
                else:
                    # this delete is for when a job is edited and no longer meets the score threshold
                    delete_params.append((id, resume['id']))
            
            # upsert recommended
            if upsert_params:
                execute_values(
                    cursor,
                    """
                    INSERT INTO recommendations (job_id, resume_id, similarity_score, keyword_score, embeddings_score, major_score, final_score)
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
            
        ws.send(json.dumps({"type": "recommend", "action": "success"}))
    except Exception as e:
        traceback.print_exc()
        ws.send(json.dumps({"type": "recommend", "action": "fail"}))
        ws.close()
        raise e
    
def recommend_by_resume(resumes, ws):
    """Recommend caused by update in resume"""
    ws.send(json.dumps({"type": "recommend", "action": "start"}))
    print(f"got {len(resumes)} to recommend")

    try:
        cursor.execute(f"""
            SELECT id, majors, skills FROM jobs
            """)
        jobs = cursor.fetchall()

        for resume in resumes:
            # search for all jobs with score > 0.5 up to 30 days ago
            thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat() # 30 days ago in Unix format
            print(f"Recommend jobs up to {thirty_days_ago}")
    
            results = client.query_points(
                collection_name=collection_name,
                query=ast.literal_eval(resume['embedding']) if isinstance(resume['embedding'], str) else resume['embedding'],
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
        
            
            recommended = {point.id: point.score for point in results.points}
            upsert_params = []
            delete_params = []
            
            print(f"{resume['name']} have {len(recommended)} recommended jobs")
                        
            r_majors, r_skills, r_raw_skills = extract_keyword(resume['content'])
            cursor.execute("""
                UPDATE resumes
                SET majors = %s, skills = %s, raw_skills = %s
                WHERE id = %s
            """, (list(r_majors), json.dumps(r_skills), list(r_raw_skills), resume['id']))
            print(f"Updated resume {resume['name']} with majors: {r_majors}, skills: {r_skills}")
            
            r_embeddings = embed_skills(r_skills)

            # evaluate every job
            for job in jobs:
                id = job['id']

                # if recommended
                if id in recommended:
                    j_majors = set(job['majors']) if job['majors'] else set()
                    j_skills = job['skills'] if job['skills'] else {}
                    j_embeddings = embed_skills(j_skills)
                    
                    freq_score, embed_score, major_score = keyword_scoring(
                        r_majors, r_skills, r_embeddings,
                        j_majors, j_skills, j_embeddings
                    )
                    final_score = (0.4 * recommended[id]) + (0.2 * freq_score) + (0.3 * embed_score) + (0.1 * major_score)
                    upsert_params.append((id, resume['id'], recommended[id], freq_score, embed_score, major_score, final_score))
                else:
                    # this delete is for when a job is edited and no longer meets the score threshold
                    delete_params.append((id, resume['id']))
                        
            # upsert recommended                        
            if upsert_params:
                execute_values(
                    cursor,
                    """
                    INSERT INTO recommendations (job_id, resume_id, similarity_score, keyword_score, embeddings_score, major_score, final_score)
                        VALUES %s
                    ON CONFLICT (job_id, resume_id)
                    DO UPDATE SET 
                        similarity_score = EXCLUDED.similarity_score,
                        keyword_score = EXCLUDED.keyword_score,
                        embeddings_score = EXCLUDED.embeddings_score,
                        major_score = EXCLUDED.major_score,
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
            
        ws.send(json.dumps({"type": "recommend", "action": "success"}))
    except Exception as e:
        traceback.print_exc()
        ws.send(json.dumps({"type": "recommend", "action": "fail"}))
        ws.close()
        raise e