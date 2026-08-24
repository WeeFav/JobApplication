from preprocess_job import extract_post_date
from datetime import datetime, timedelta
from urllib.parse import urlparse, urljoin
import requests
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from scrape_ats_helper import get_company_by_board, get_board_by_company, is_valid_job


def extract_page(url):
    r = requests.get(url)
    job = r.json()
    
    job_info = job['jobPostingInfo']
    title = job_info['title']
    description = job_info['jobDescription']
    location = job_info['location']
    post_date_raw = job_info['postedOn']
    
    post_date = extract_post_date(post_date_raw.lower())
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
    company_tag = path_parts[2]
    db_company, _ = get_company_by_board('workday', company_tag)
    company = db_company if db_company else company_tag.capitalize()

    # Construct the user-facing URL
    site = path_parts[3]
    job_title = path_parts[5]
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
    
    limit = 20 # workday API max limit is 20, or else will return 400
    
    # First request to get total count & initial page
    initial_payload = {
        "appliedFacets": {},
        "limit": limit,
        "offset": 0,
        "searchText": ""
    }
    
    data = {}
    for attempt in range(5):
        try:
            r = requests.post(query_url, json=initial_payload, timeout=15)
            if r.status_code == 200:
                data = r.json()
                break
            elif r.status_code == 429:
                wait_time = 2 ** attempt
                print(f"Rate limited (HTTP 429) on initial query to {query_url}, retrying in {wait_time}s... (attempt {attempt + 1}/5)")
                time.sleep(wait_time)
            else:
                print(f"Failed initial query to {query_url}: HTTP {r.status_code}")
                break
        except Exception as e:
            print(f"Failed initial query to {query_url}: {e}")
            time.sleep(1)
        
    job_postings = data.get("jobPostings", [])
    total_jobs = data.get("total", 0)
    print(f"Total jobs count: {total_jobs}. Initial page fetched {len(job_postings)} jobs.")

    # Fetch remaining pages in parallel
    offsets = list(range(limit, total_jobs, limit))
    
    def fetch_offset(off):
        payload = {
            "appliedFacets": {},
            "limit": limit,
            "offset": off,
            "searchText": ""
        }
        for attempt in range(5):
            try:
                resp = requests.post(query_url, json=payload, timeout=15)
                if resp.status_code == 200:
                    postings = resp.json().get("jobPostings", [])
                    print(f"Fetched offset {off}, got {len(postings)} jobs")
                    return postings
                elif resp.status_code == 429:
                    wait_time = 2 ** attempt
                    print(f"Rate limited (HTTP 429) on offset {off}, retrying in {wait_time}s... (attempt {attempt + 1}/5)")
                    time.sleep(wait_time)
                else:
                    print(f"Failed offset {off}: HTTP {resp.status_code}")
                    break
            except Exception as e:
                print(f"Error fetching offset {off}: {e}")
                time.sleep(1)
        return []

    if offsets:
        print(f"Fetching {len(offsets)} remaining pages in parallel...")
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(fetch_offset, off) for off in offsets]
            for future in as_completed(futures):
                job_postings.extend(future.result())


    print(f"Found {len(job_postings)} total jobs.")
    
    filtered_jobs = []
    for job in job_postings:
        title = job.get("title", "")
        locations_text = job.get("locationsText", "")
        external_path = job.get("externalPath", "")
                
        if is_valid_job(title, locations_text):
            filtered_jobs.append(job)
            
    print(f"Found {len(filtered_jobs)} matching jobs.")
    
    scraped_jobs = []
    for job_dict in filtered_jobs:
        external_path = job_dict.get("externalPath", "")
        parts = external_path.split("/")
        clean_external_path = f"/job/{parts[-1]}"
        job_api_url = base_api_url.rstrip("/") + clean_external_path
        try:
            print(f"Scraping details for {job_dict.get('title')}...")
            job_info = extract_page(job_api_url)
            scraped_jobs.append(job_info)
            if ws is not None:
                ws.send(json.dumps({"type": "scrape", "action": "update"}))
            print(f"{job_info['title']} | {job_info['company']} | {job_info['description'][:100]} | {job_info['url']} | {job_info['location']} | {job_info['post_date']}")
        except Exception as e:
            print(f"Error extracting page for {job_api_url}: {e}")
            
    return scraped_jobs


if __name__ == '__main__':
    pass       