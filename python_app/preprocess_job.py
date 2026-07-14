import pandas as pd
from langchain_google_genai import ChatGoogleGenerativeAI
import time
from google.api_core.exceptions import ResourceExhausted
import os
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode
from dotenv import load_dotenv
from datetime import datetime, timedelta
import re
from bs4 import BeautifulSoup

load_dotenv()

llm = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite",
    temperature=0,
)

PROMPT = """
You are an information extraction system.

Task:
Extract only the sections of the job description that help determine whether a candidate is qualified for the role.

Keep:
- Job title
- Role overview / position summary
- Responsibilities
- Duties
- Required qualifications
- Preferred qualifications
- Required skills
- Technical skills
- Education requirements
- Experience requirements
- Certifications
- "Who we are looking for" sections
- Any paragraph that describes what the employee will do or what qualifications they need

Remove:
- Company descriptions
- Company history
- Mission statements
- Vision statements
- Culture descriptions
- Diversity, equity, and inclusion statements
- Benefits and perks
- Compensation and salary information
- Equal opportunity employer statements
- Recruiting process descriptions
- Legal disclaimers
- Office amenities
- Generic marketing content

Rules:
- Do NOT summarize.
- Preserve the original wording exactly.
- Keep original section titles/subtitles when relevant.
- Remove only irrelevant sections.
- Maintain the original order of the remaining content.
- Output plain text only.
- Do not use markdown.
- Do not add explanations, comments, or notes.
- If a section contains both relevant and irrelevant content, keep only the relevant paragraphs.

Job Description:

{job_description}
"""

def extract_description(description):
    """extract job description"""
    messages = [
        ("human", PROMPT.format(job_description=description))
    ]
    
    while True:
        try:
            ai_msg = llm.invoke(messages)
            description_extracted = ai_msg.content
            return description_extracted[0]['text']
        except ResourceExhausted as e:
            print(f"Retrying in 60 seconds...")
            time.sleep(60)


def canonicalize_url(url):
    """Canonicalizes a URL by sorting query parameters and optionally removing some."""
    
    parsed = urlparse(url)
    
    # Trim trailing paths for specific sources
    source = extract_source_from_url(url)
    path = parsed.path
    if source == "ashby":
        if path.endswith("/application"):
            path = path[:-12]
        elif path.endswith("/application/"):
            path = path[:-13]
    elif source == "lever":
        if path.endswith("/apply"):
            path = path[:-6]
        elif path.endswith("/apply/"):
            path = path[:-7]

    # Sort and filter query parameters
    query_params = parse_qsl(parsed.query, keep_blank_values=True)
    filtered_params = []
    for k, v in query_params:
        k_lower = k.lower()
        if any(sub in k_lower for sub in ["source", "src", "utm", "ref"]):
            continue
        filtered_params.append((k, v))
    sorted_params = sorted(filtered_params)

    # Rebuild the query string
    canonical_query = urlencode(sorted_params)

    # Rebuild the full URL
    canonical = parsed._replace(path=path, query=canonical_query, fragment="")
    return urlunparse(canonical)

def extract_post_date(text):
    # Get today's date
    today = datetime.today()
    
    # Extract the number and unit (day/week)
    match = re.search(r'(\d+)\+?\s+(minute|hour|day|week)s?', text)
    if not match:
        return None  # invalid format
    
    value = int(match.group(1))
    unit = match.group(2)

    # Compute the timedelta 
    if unit == 'minute':
        delta = timedelta(minutes=value)
    elif unit == 'hour':
        delta = timedelta(hours=value)
    elif unit == 'day':
        delta = timedelta(days=value)
    elif unit == 'week':
        delta = timedelta(weeks=value)

    # Subtract from today to get actual post date
    post_date = today - delta
    return post_date.strftime('%Y-%m-%d')

def extract_source_from_url(url):
    netloc = urlparse(url).netloc.lower()
    if "myworkdayjobs.com" in netloc:
        return "workday"
    if "greenhouse.io" in netloc:
        return "greenhouse"
    if "lever.co" in netloc:
        return "lever"
    if "ashbyhq.com" in netloc:
        return "ashby"
    if "linkedin.com" in netloc:
        return "linkedin"
    if "jobright.ai" in netloc:
        return "jobright"
    netloc = netloc.replace("www.", "")
    return netloc.split(".")[0]


def clean_html(text):
    if not text:
        return ""
    soup = BeautifulSoup(text, "html.parser")
    if bool(soup.find()):
        return soup.get_text(separator="\n")
    return text