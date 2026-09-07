import requests
from urllib.parse import urlparse
import json
from scrape_ats_helper import get_company_by_board, get_board_by_company, is_valid_job


def extract_page(url_api):
    r = requests.get(url_api)
    job = r.json()
    
    title = job.get("title", "")
    company = job.get("company_name", "")
    description = job.get("content", "")
    url = job.get("absolute_url", "")
    
    location_data = job.get("location", {})
    location = location_data.get("name", "") if isinstance(location_data, dict) else str(location_data)
    
    post_date_raw = job.get("first_published", "")
    post_date = post_date_raw.split("T")[0] if "T" in post_date_raw else post_date_raw
    
    return {
        "title": title,
        "company": company,
        "description": description,
        "url": url,
        "location": location,
        "post_date": post_date
    }

def scrape_from_url(url):
    print(f"scraping {url}")
    parsed = urlparse(url)
    path_parts = parsed.path.strip("/").split("/")
    if "/v1/boards/" in url:
        url_api = url
        company_board_name = path_parts[2]
    else:
        company_board_name = path_parts[0]
        job_id = path_parts[2]
        url_api = f"https://boards-api.greenhouse.io/v1/boards/{company_board_name}/jobs/{job_id}"
    
    db_company = get_company_by_board('greenhouse', company_board_name)
    if not db_company:
        raise ValueError(f"Company board '{company_board_name}' is not supported under Greenhouse.")
    
    return extract_page(url_api)

def scrape(company, ws=None):
    board_name = get_board_by_company('greenhouse', company)
    if not board_name:
        board_name = company.lower()
    url_api = f"https://boards-api.greenhouse.io/v1/boards/{board_name}/jobs"
    print(f"Querying jobs from {url_api}...")
    
    r = requests.get(url_api)
    data = r.json()
    
    jobs = data.get("jobs", [])
    print(f"Found {len(jobs)} jobs.")

    filtered_jobs = []
    
    for job in jobs:
        title = job.get("title", "")
        location_data = job.get("location", {})
        location_name = location_data.get("name", "") if isinstance(location_data, dict) else str(location_data)
        
        if is_valid_job(title, location_name):
            filtered_jobs.append(job)
            
    print(f"Found {len(filtered_jobs)} matching jobs.")
    
    scraped_jobs = []
    for job in filtered_jobs:
        job_id = job.get("id")
        job_url_api = f"https://boards-api.greenhouse.io/v1/boards/{board_name}/jobs/{job_id}"
        print(f"Scraping details for {job.get('title')}...")
        try:
            job_info = extract_page(job_url_api)
            scraped_jobs.append(job_info)
            if ws is not None:
                ws.send(json.dumps({"type": "scrape", "action": "update"}))
        except Exception as e:
            print(f"Failed to extract details for job {job_id}: {e}")
    return scraped_jobs, len(jobs), len(filtered_jobs)

if __name__ == '__main__':
    # Test scrape_from_url
    # print("Testing scrape_from_url...")
    # job = scrape_from_url("https://job-boards.greenhouse.io/spacex/jobs/8399574002?gh_jid=8399574002")
    # print(f"Scraped job: {job['title']} | {job['company']} | {job['location']} | {job['post_date']}")
    
    # Test scrape
    print(extract_page())