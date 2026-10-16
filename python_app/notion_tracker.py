"""Streamlit app: scrape a job URL (title, company, normalized url) and log it to a Notion table.

Run:  conda activate aijob && streamlit run notion_tracker.py
Needs in .env (repo root or python_app/):  NOTION_TOKEN, NOTION_DATABASE_ID
"""
import os
from datetime import date
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

import requests
import streamlit as st
from dotenv import load_dotenv

def canonicalize_url(url: str) -> str:
    """Drop tracking params (source/src/utm/ref), sort the rest, trim /apply, drop fragment."""
    p = urlparse(url)
    path = p.path
    for suffix in ("/application", "/apply"):
        if ("ashbyhq.com" in p.netloc or "lever.co" in p.netloc) and path.rstrip("/").endswith(suffix):
            path = path.rstrip("/")[: -len(suffix)]
    q = sorted((k, v) for k, v in parse_qsl(p.query, keep_blank_values=True)
               if not any(t in k.lower() for t in ("source", "src", "utm", "ref")))
    return urlunparse(p._replace(path=path, query=urlencode(q), fragment=""))


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
for p in (os.path.join(BASE_DIR, ".env"), os.path.join(BASE_DIR, "..", ".env")):
    if os.path.exists(p):
        load_dotenv(p)

NOTION_TOKEN = os.environ.get("NOTION_TOKEN", "")
NOTION_DATABASE_ID = os.environ.get("NOTION_DATABASE_ID", "")
NOTION_VERSION = "2022-06-28"
SOURCES = ["Github", "Linkedin", "Jobright", "Other"]


UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0 Safari/537.36"}


def _slug_name(slug: str) -> str:
    return slug.replace("-", " ").replace("_", " ").title()


def _workday(url: str) -> dict:
    p = urlparse(url)
    tag = p.netloc.lower().split(".")[0]
    parts = [x for x in p.path.split("/") if x]
    if "job" not in parts:
        raise ValueError("Not a Workday job URL (no /job/ segment)")
    i = parts.index("job")
    site = parts[i - 1]
    api = f"{p.scheme}://{p.netloc}/wday/cxs/{tag}/{site}/job/" + "/".join(parts[i + 1:])
    r = requests.get(api, headers={**UA, "Accept": "application/json"}, timeout=20)
    r.raise_for_status()
    d = r.json()
    info = d["jobPostingInfo"]
    company = (d.get("hiringOrganization") or {}).get("name") or _slug_name(tag)
    return {"title": info["title"], "company": company,
            "url": info.get("externalUrl") or f"{p.scheme}://{p.netloc}/{site}/job/" + "/".join(parts[i + 1:])}


def _greenhouse(url: str):
    p = urlparse(url)
    parts = [x for x in p.path.split("/") if x]
    if "greenhouse.io" not in p.netloc or "jobs" not in parts or parts.index("jobs") == 0:
        return None
    i = parts.index("jobs")
    board, job_id = parts[i - 1], parts[i + 1]
    r = requests.get(f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs/{job_id}", timeout=20)
    r.raise_for_status()
    d = r.json()
    return {"title": d.get("title", ""), "company": d.get("company_name") or _slug_name(board),
            "url": d.get("absolute_url") or url}


def _lever(url: str) -> dict:
    parts = [x for x in urlparse(url).path.split("/") if x]
    company, job_id = parts[0], parts[1]
    r = requests.get(f"https://api.lever.co/v0/postings/{company}/{job_id}", timeout=20)
    r.raise_for_status()
    d = r.json()
    return {"title": d.get("text", ""), "company": _slug_name(company),
            "url": d.get("hostedUrl") or f"https://jobs.lever.co/{company}/{job_id}"}


def _ashby(url: str) -> dict:
    parts = [x for x in urlparse(url).path.split("/") if x]
    board, job_id = parts[0], parts[1]
    q = ("query ApiJobPosting($organizationHostedJobsPageName: String!, $jobPostingId: String!) "
         "{ jobPosting(organizationHostedJobsPageName: $organizationHostedJobsPageName, "
         "jobPostingId: $jobPostingId) { id title } }")
    r = requests.post("https://jobs.ashbyhq.com/api/non-user-graphql", timeout=20, json={
        "operationName": "ApiJobPosting", "query": q,
        "variables": {"organizationHostedJobsPageName": board, "jobPostingId": job_id}})
    r.raise_for_status()
    jp = (r.json().get("data") or {}).get("jobPosting")
    if not jp:
        raise ValueError("Ashby posting not found")
    return {"title": jp["title"], "company": _slug_name(board), "url": f"https://jobs.ashbyhq.com/{board}/{job_id}"}


def scrape(url: str) -> dict:
    """Derive the API call from the URL itself (no company_ats table); fall back to Playwright+LLM."""
    host = urlparse(url).netloc.lower()
    job = None
    try:
        if "myworkdayjobs.com" in host or "myworkdaysite.com" in host:
            job = _workday(url)
        elif "greenhouse.io" in host:
            job = _greenhouse(url)
        elif "lever.co" in host:
            job = _lever(url)
        elif "ashbyhq.com" in host:
            job = _ashby(url)
    except Exception as e:
        st.warning(f"ATS API route failed ({e}); falling back to page extraction.")
    if not job:
        import extract_job_from_url  # heavy: playwright + langchain
        e = extract_job_from_url.extract_job(url)
        job = {"title": e.get("job_title", ""), "company": e.get("company", ""), "url": e.get("url", url)}
    return {"title": job["title"], "company": job["company"], "url": canonicalize_url(job["url"])}


def _headers():
    return {
        "Authorization": f"Bearer {NOTION_TOKEN}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }


def _value(ptype: str, val: str):
    if ptype == "title":
        return {"title": [{"text": {"content": val}}]}
    if ptype == "rich_text":
        return {"rich_text": [{"text": {"content": val}}]}
    if ptype == "url":
        return {"url": val}
    if ptype == "select":
        return {"select": {"name": val}}
    if ptype == "date":
        return {"date": {"start": val}}
    raise ValueError(f"Unsupported Notion property type '{ptype}'")


def add_to_notion(row: dict):
    """Build properties from the DB's actual schema so column types don't have to match my guess."""
    r = requests.get(f"https://api.notion.com/v1/databases/{NOTION_DATABASE_ID}", headers=_headers(), timeout=30)
    r.raise_for_status()
    schema = r.json()["properties"]
    props = {}
    for name, val in row.items():
        if name not in schema:
            raise KeyError(f"Notion table has no column '{name}' (found: {', '.join(schema)})")
        props[name] = _value(schema[name]["type"], val)
    r = requests.post(
        "https://api.notion.com/v1/pages",
        headers=_headers(),
        json={"parent": {"database_id": NOTION_DATABASE_ID}, "properties": props},
        timeout=30,
    )
    if not r.ok:
        raise RuntimeError(f"Notion error {r.status_code}: {r.text}")
    return r.json().get("url")


st.set_page_config(page_title="Job Tracker", page_icon="📝")
st.title("Add job to Notion")

if not NOTION_TOKEN or not NOTION_DATABASE_ID:
    st.error("Set NOTION_TOKEN and NOTION_DATABASE_ID in your .env")
    st.stop()

with st.form("job"):
    url = st.text_input("Job URL")
    source = st.selectbox("Source", SOURCES)
    submitted = st.form_submit_button("Scrape & add")

if submitted and url.strip():
    try:
        with st.spinner("Scraping..."):
            job = scrape(url.strip())
        st.write(job)
        with st.spinner("Adding to Notion..."):
            page_url = add_to_notion({
                "Title": job["title"],
                "Company": job["company"],
                "Application Date": date.today().isoformat(),
                "Source": source,
                "url": job["url"],
            })
        st.success("Added to Notion")
        if page_url:
            st.markdown(f"[Open page]({page_url})")
    except Exception as e:
        st.error(str(e))
