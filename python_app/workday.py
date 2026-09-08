import hashlib
import re
import os
import requests
import json
import time
from urllib.parse import urlparse, urljoin
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

from preprocess_job import extract_post_date, canonicalize_url
from scrape_ats_helper import get_company_by_board, get_board_by_company, is_valid_job, get_db_connection

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Content-Type": "application/json"
}

INTERN_FACET_REGEX = re.compile(
    r'\b(intern|interns|internship|co[\s-]?op|coop|student\s*workers?|student\s*programs?|student|apprentice|early[\s-]?career)\b',
    re.IGNORECASE
)
EXCLUDE_FACET_REGEX = re.compile(r'\b(internal|international)\b', re.IGNORECASE)

TARGET_FACET_PARAMS = {
    "workersubtype",
    "jobfamily",
    "jobfamilygroup",
    "jobfamilygrouphierarchy",
    "job_profiles",
    "jobcategory",
    "job_type",
    "employment_type",
    "workertype"
}


def _post_with_retry(session, url, payload, max_retries=5):
    """Executes POST request with backoff retry on HTTP 429."""
    for attempt in range(max_retries):
        try:
            resp = session.post(url, json=payload, headers=HEADERS, timeout=15)
            if resp.status_code == 200:
                return resp.json()
            elif resp.status_code == 429:
                wait_time = int(resp.headers.get("Retry-After", 2 ** attempt))
                print(f"Rate limited (HTTP 429) on {url}, retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                time.sleep(wait_time)
            else:
                print(f"Failed POST to {url}: HTTP {resp.status_code}")
                break
        except Exception as e:
            print(f"Error POST to {url}: {e}")
            time.sleep(1)
    return None


def discover_intern_facets(facets_data):
    """
    Dynamically inspects the facets returned in the initial Workday response
    and extracts matching IDs for intern/student/co-op categories.
    """
    applied_facets = {}
    applied_details = []

    for facet in facets_data:
        param = facet.get("facetParameter", "")
        param_lower = param.lower()

        if param_lower in TARGET_FACET_PARAMS or "subtype" in param_lower or "family" in param_lower or "type" in param_lower:
            matching_ids = []
            for val in facet.get("values", []):
                descriptor = val.get("descriptor", "")
                val_id = val.get("id")
                count = val.get("count", 0)

                if INTERN_FACET_REGEX.search(descriptor) and not EXCLUDE_FACET_REGEX.search(descriptor):
                    if val_id:
                        matching_ids.append(val_id)
                        applied_details.append(f"{param}: '{descriptor}' (count={count})")

            if matching_ids:
                applied_facets[param] = matching_ids

    return applied_facets, applied_details


def extract_page(url, session=None):
    client = session or requests
    r = client.get(url, headers=HEADERS, timeout=15)
    job = r.json()
    
    job_info = job['jobPostingInfo']
    title = job_info['title']
    description = job_info['jobDescription']
    location = job_info.get('location', '')
    post_date_raw = job_info.get('postedOn', '')
    
    post_date = extract_post_date(post_date_raw.lower()) if post_date_raw else None
    if not post_date:
        today = datetime.today()
        if "today" in post_date_raw.lower():
            post_date = today.strftime('%Y-%m-%d')
        elif "yesterday" in post_date_raw.lower():
            post_date = (today - timedelta(days=1)).strftime('%Y-%m-%d')
        else:
            post_date = today.strftime('%Y-%m-%d')

    # Derive company tag and site from API url
    parsed_url = urlparse(url)
    path_parts = parsed_url.path.strip("/").split("/")
    company_tag = path_parts[2] if len(path_parts) > 2 else ""
    db_company, _ = get_company_by_board('workday', company_tag) if company_tag else (None, None)
    company = db_company if db_company else company_tag.capitalize()

    # Construct the user-facing URL
    site = path_parts[3] if len(path_parts) > 3 else ""
    job_title = path_parts[5] if len(path_parts) > 5 else ""
    user_url = f"{parsed_url.scheme}://{parsed_url.netloc}/en-US/{site}/job/{job_title}"

    return {
        "title": title,
        "company": company,
        "description": description,
        "url": user_url,
        "location": location,
        "post_date": post_date
    }


def scrape_from_url(url):
    print(f"scraping {url}")
    parsed = urlparse(url)
    
    # Extract the company tag (e.g. "nvidia")
    netloc = parsed.netloc.lower()
    netloc = netloc.replace("www.", "")
    company_tag = netloc.split(".")[0]
    
    company_name, base_url = get_company_by_board('workday', company_tag)
    if not company_name and not base_url:
        raise ValueError(f"Company board '{company_tag}' is not supported under Workday.")
    
    if not company_name:
        company_name = company_tag.capitalize()
        
    # Extract the job title
    path_parts = parsed.path.strip("/").split("/")
    job_title = path_parts[-1]
    
    if not base_url:
        site = path_parts[1]
        base_url = f"{parsed.scheme}://{parsed.netloc}/wday/cxs/{company_tag}/{site}"
        
    api_job_url = f"{base_url}/job/{job_title}"
    print(f"API URL: {api_job_url}")
    
    job = extract_page(api_job_url)
    
    print(f"{job['title']} | {job['company']} | {job['description'][:100]} | {job['url']} | {job['location']} | {job['post_date']}")

    return job


def scrape(company, ws=None):
    _, base_api_url = get_board_by_company('workday', company)
    if not base_api_url:
        print(f"Company {company} not found in company_ats table for Workday.")
        return []
    
    query_url = f"{base_api_url.rstrip('/')}/jobs"
    print(f"Querying jobs from {query_url}...")
    
    session = requests.Session()
    limit = 20  # Workday API max limit is 20
    
    # 1. First request to inspect total count and dynamic facets
    initial_payload = {
        "appliedFacets": {},
        "limit": limit,
        "offset": 0,
        "searchText": ""
    }
    
    initial_data = _post_with_retry(session, query_url, initial_payload) or {}
    total_unfiltered_jobs = initial_data.get("total", 0)
    facets_list = initial_data.get("facets", [])
    applied_facets, applied_details = discover_intern_facets(facets_list)

    job_postings = []
    
    if applied_facets:
        print(f"[{company}] Applying discovered intern facets: {applied_details}")
        facet_payload = {
            "appliedFacets": applied_facets,
            "limit": limit,
            "offset": 0,
            "searchText": ""
        }
        facet_data = _post_with_retry(session, query_url, facet_payload) or {}
        total_jobs = facet_data.get("total", 0)
        job_postings = list(facet_data.get("jobPostings", []))
        print(f"[{company}] Scoping down to {total_jobs} facet-matching jobs.")

        offsets = list(range(limit, total_jobs, limit))
        if offsets:
            def fetch_facet_offset(off):
                payload = {
                    "appliedFacets": applied_facets,
                    "limit": limit,
                    "offset": off,
                    "searchText": ""
                }
                res = _post_with_retry(session, query_url, payload)
                return res.get("jobPostings", []) if res else []

            workers = min(len(offsets), 5)
            with ThreadPoolExecutor(max_workers=workers) as executor:
                futures = [executor.submit(fetch_facet_offset, off) for off in offsets]
                for future in as_completed(futures):
                    job_postings.extend(future.result())
    else:
        # Fallback to standard offset scan when no intern facets exist
        total_jobs = initial_data.get("total", 0)
        job_postings = list(initial_data.get("jobPostings", []))
        print(f"[{company}] No intern facets detected. Total jobs count: {total_jobs}. Initial page fetched {len(job_postings)} jobs.")

        offsets = list(range(limit, total_jobs, limit))
        if offsets:
            def fetch_offset(off):
                payload = {
                    "appliedFacets": {},
                    "limit": limit,
                    "offset": off,
                    "searchText": ""
                }
                res = _post_with_retry(session, query_url, payload)
                return res.get("jobPostings", []) if res else []

            with ThreadPoolExecutor(max_workers=5) as executor:
                futures = [executor.submit(fetch_offset, off) for off in offsets]
                for future in as_completed(futures):
                    job_postings.extend(future.result())

    print(f"Found {len(job_postings)} candidate postings.")
    
    parsed_base = urlparse(base_api_url)
    path_parts = parsed_base.path.strip("/").split("/")
    company_tag = path_parts[2] if len(path_parts) > 2 else ""
    site = path_parts[3] if len(path_parts) > 3 else ""

    db_company, _ = get_company_by_board('workday', company_tag) if company_tag else (None, None)
    canonical_company = db_company if db_company else (company if company else company_tag.capitalize())

    candidates = []
    hashes_to_check = []
    for job in job_postings:
        title = job.get("title", "")
        locations_text = job.get("locationsText", "")
        external_path = job.get("externalPath", "")
                
        if is_valid_job(title, locations_text):
            job_slug = external_path.split("/")[-1]
            clean_external_path = f"/job/{job_slug}"
            job_api_url = base_api_url.rstrip("/") + clean_external_path

            if site:
                user_url = f"{parsed_base.scheme}://{parsed_base.netloc}/en-US/{site}/job/{job_slug}"
            else:
                user_url = f"{parsed_base.scheme}://{parsed_base.netloc}/job/{job_slug}"

            url_norm = canonicalize_url(user_url)
            title_norm = title.strip().lower()
            company_norm = canonical_company.strip().lower()
            combined = title_norm + company_norm + url_norm
            job_hash = hashlib.sha256(combined.encode('utf-8')).hexdigest()

            candidates.append({
                "job_dict": job,
                "job_api_url": job_api_url,
                "hash": job_hash,
                "title": title,
                "url": user_url
            })
            hashes_to_check.append(job_hash)
            
    print(f"Found {len(candidates)} matching valid jobs.")
    
    existing_hashes = set()
    if hashes_to_check:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT hash FROM jobs WHERE hash = ANY(%s)", (hashes_to_check,))
            rows = cursor.fetchall()
            existing_hashes = {row[0] for row in rows}
            cursor.close()
            conn.close()
        except Exception as e:
            print(f"Error checking existing jobs in DB: {e}")

    new_jobs_to_scrape = [c for c in candidates if c["hash"] not in existing_hashes]
    skipped_count = len(candidates) - len(new_jobs_to_scrape)
    if skipped_count > 0:
        print(f"Skipping {skipped_count} jobs already in DB.")
    print(f"Fetching details for {len(new_jobs_to_scrape)} new jobs...")
    
    scraped_jobs = []
    if new_jobs_to_scrape:
        def fetch_detail(item):
            job_api_url = item["job_api_url"]
            title = item["title"]
            try:
                print(f"Scraping details for {title}...")
                job_info = extract_page(job_api_url, session=session)
                if ws is not None:
                    ws.send(json.dumps({"type": "scrape", "action": "update"}))
                print(f"{job_info['title']} | {job_info['company']} | {job_info['description'][:100]} | {job_info['url']} | {job_info['location']} | {job_info['post_date']}")
                return job_info
            except Exception as e:
                print(f"Error extracting page for {job_api_url}: {e}")
                return None

        workers = min(len(new_jobs_to_scrape), 5)
        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = [executor.submit(fetch_detail, item) for item in new_jobs_to_scrape]
            for future in as_completed(futures):
                res = future.result()
                if res:
                    scraped_jobs.append(res)
            
    return scraped_jobs, total_unfiltered_jobs, len(candidates)


if __name__ == '__main__':
    pass