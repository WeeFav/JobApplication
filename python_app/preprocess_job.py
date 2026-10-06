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

try:
    from langchain_google_genai.chat_models import GoogleRateLimitError
except ImportError:
    class GoogleRateLimitError(Exception):
        pass

load_dotenv()

def _get_api_keys():
    keys = []
    k1 = os.environ.get("GOOGLE_API_KEY")
    if k1 and k1.strip():
        keys.append(k1.strip())
    k2 = os.environ.get("GOOGLE_API_KEY_2")
    if k2 and k2.strip():
        keys.append(k2.strip())
    return keys

API_KEYS = _get_api_keys()
current_key_index = 0

def get_current_api_key():
    global current_key_index, API_KEYS
    if not API_KEYS:
        API_KEYS = _get_api_keys()
    if API_KEYS and 0 <= current_key_index < len(API_KEYS):
        return API_KEYS[current_key_index]
    return os.environ.get("GOOGLE_API_KEY")

def get_llm(model="gemini-3.1-flash-lite", temperature=0):
    key = get_current_api_key()
    return ChatGoogleGenerativeAI(
        model=model,
        temperature=temperature,
        google_api_key=key,
    )

def switch_to_next_api_key():
    global current_key_index, llm, API_KEYS
    if not API_KEYS:
        API_KEYS = _get_api_keys()
    if current_key_index < len(API_KEYS) - 1:
        current_key_index += 1
        new_key = API_KEYS[current_key_index]
        key_name = f"GOOGLE_API_KEY_{current_key_index + 1}" if current_key_index > 0 else "GOOGLE_API_KEY"
        print(f"[!] Daily 500 request quota reached. Switching to {key_name}...")
        os.environ["GOOGLE_API_KEY"] = new_key
        llm = get_llm()
        return True
    return False

def is_daily_limit_error(e: Exception) -> bool:
    err_str = str(e).lower()
    return "limit: 500" in err_str or "limit 500" in err_str or "generaterequestsperday" in err_str or "free_tier_requests" in err_str

llm = get_llm()

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
    global llm
    messages = [
        ("human", PROMPT.format(job_description=description))
    ]
    
    while True:
        try:
            ai_msg = llm.invoke(messages)
            description_extracted = ai_msg.content
            if isinstance(description_extracted, list) and len(description_extracted) > 0:
                first = description_extracted[0]
                if isinstance(first, dict) and 'text' in first:
                    return first['text']
                return str(first)
            return str(description_extracted)
        except Exception as e:
            err_str = str(e)
            if "RESOURCE_EXHAUSTED" in err_str or "429" in err_str or isinstance(e, (ResourceExhausted, GoogleRateLimitError)):
                if is_daily_limit_error(e):
                    if switch_to_next_api_key():
                        continue
                    else:
                        print("[!] All available Google API keys have exceeded their daily 500 request quota.")
                        raise e
                else:
                    print(f"Rate limit hit (per-minute). Retrying in 60 seconds... ({e})")
                    time.sleep(60)
            else:
                raise e


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
    parsed = urlparse(url)
    netloc = parsed.netloc.lower()
    if "myworkdayjobs.com" in netloc or "myworkdaysite.com" in netloc:
        return "workday"
    if "greenhouse.io" in netloc:
        return "greenhouse"
    if "lever.co" in netloc:
        return "lever"
    if "ashbyhq.com" in netloc:
        return "ashby"
    # Check query parameters for specific source signatures
    query_dict = dict(parse_qsl(parsed.query))
    if "gh_jid" in query_dict:
        return "greenhouse"
    if "ashby_jid" in query_dict:
        return "ashby"
        
    netloc = netloc.replace("www.", "")
    return netloc.split(".")[0]


def clean_html(text):
    if not text:
        return ""
    soup = BeautifulSoup(text, "html.parser")
    if bool(soup.find()):
        return soup.get_text(separator="\n")
    return text