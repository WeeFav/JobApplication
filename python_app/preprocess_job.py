import pandas as pd
from langchain_google_genai import ChatGoogleGenerativeAI
import time
from google.api_core.exceptions import ResourceExhausted
import os
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode
from dotenv import load_dotenv

load_dotenv()

llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    temperature=0,
)

prompt = """
Here's a job description. Please extract only the subtitles and paragraphs that describe what the role is about, responsibilities, required skills, or who they are looking for. 
Do not include paragraphs that only describe the company, values, benefits. 
Do not summarize, only remove irrelevant text.
Do not add any markdown formatting, only keep plain text.
"""

def extract_description(description):
    """extract job description"""
    messages = [
        ("system", prompt),
        ("human", description)
    ]
    
    while True:
        try:
            ai_msg = llm.invoke(messages)
            description_extracted = ai_msg.content
            return description_extracted
        except ResourceExhausted as e:
            print(f"Retrying in 60 seconds...")
            time.sleep(60)


def canonicalize_url(url):
    """Canonicalizes a URL by sorting query parameters and optionally removing some."""
    
    remove_params = set(["utm_source", "utm_medium", "utm_campaign", "ref", "source"])

    parsed = urlparse(url)
    # Sort and filter query parameters
    query_params = parse_qsl(parsed.query, keep_blank_values=True)
    filtered_params = [(k, v) for k, v in query_params if k not in remove_params]
    sorted_params = sorted(filtered_params)

    # Rebuild the query string
    canonical_query = urlencode(sorted_params)

    # Rebuild the full URL
    canonical = parsed._replace(query=canonical_query, fragment="")
    return urlunparse(canonical)

