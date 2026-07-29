import requests
from urllib.parse import urlparse
import json
import os
import psycopg2
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

def get_db_connection():
    db_host = os.environ.get("POSTGRES_HOST", "postgres")
    try:
        return psycopg2.connect(
            host=db_host,
            user=os.environ.get("POSTGRES_USER"),
            password=os.environ.get("POSTGRES_PASSWORD"),
            database=os.environ.get("POSTGRES_DB"),
            port=os.environ.get("POSTGRES_PORT")
        )
    except psycopg2.OperationalError:
        if db_host != "localhost":
            return psycopg2.connect(
                host="localhost",
                user=os.environ.get("POSTGRES_USER"),
                password=os.environ.get("POSTGRES_PASSWORD"),
                database=os.environ.get("POSTGRES_DB"),
                port=os.environ.get("POSTGRES_PORT")
            )
        raise

def get_greenhouse_company_by_board(board):
    """Finds company name for a given board from postgres company_ats table."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT company FROM company_ats WHERE ats = 'greenhouse' AND LOWER(board) = LOWER(%s)",
            (board,)
        )
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        if row:
            return row[0]
    except Exception as e:
        print(f"DB query error: {e}")
    return None

def get_greenhouse_board_by_company(company):
    """Finds board for a given company from postgres company_ats table."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT board FROM company_ats WHERE ats = 'greenhouse' AND (company = %s OR LOWER(company) = LOWER(%s))",
            (company, company)
        )
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        if row and row[0]:
            return row[0]
    except Exception as e:
        print(f"DB query error: {e}")
    return None

def is_usa_location(location_name):
    loc_lower = location_name.lower()
    if "usa" in loc_lower or "united states" in loc_lower:
        return True
    # Standard US state abbreviations
    states = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"]
    for state in states:
        if f", {state}" in location_name or f" - {state}" in location_name or location_name.endswith(f" {state}") or "flexible" in loc_lower:
            return True
    return False

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
    
    db_company = get_greenhouse_company_by_board(company_board_name)
    if not db_company:
        raise ValueError(f"Company board '{company_board_name}' is not supported under Greenhouse.")
    
    return extract_page(url_api)

def scrape(company, ws=None):
    board_name = get_greenhouse_board_by_company(company)
    if not board_name:
        board_name = company.lower()
    url_api = f"https://boards-api.greenhouse.io/v1/boards/{board_name}/jobs"
    print(f"Querying jobs from {url_api}...")
    
    r = requests.get(url_api)
    data = r.json()
    
    jobs = data.get("jobs", [])
    filtered_jobs = []
    
    for job in jobs:
        title = job.get("title", "")
        location_data = job.get("location", {})
        location_name = location_data.get("name", "") if isinstance(location_data, dict) else str(location_data)
        
        # Check if title has 'intern' (excluding 'international' and 'internal')
        title_lower = title.lower()
        is_intern = "intern" in title_lower and "internal" not in title_lower and "international" not in title_lower
        
        # Check if location name indicates USA
        is_usa = is_usa_location(location_name)
        
        if is_intern and is_usa:
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
            
    return scraped_jobs

if __name__ == '__main__':
    # Test scrape_from_url
    print("Testing scrape_from_url...")
    job = scrape_from_url("https://job-boards.greenhouse.io/spacex/jobs/8399574002?gh_jid=8399574002")
    print(f"Scraped job: {job['title']} | {job['company']} | {job['location']} | {job['post_date']}")
    
    # Test scrape
    print("\nTesting scrape('SpaceX')...")
    spacex_jobs = scrape("SpaceX")
    print(f"Found {len(spacex_jobs)} jobs:")
    for j in spacex_jobs:
        print(f" - {j['title']} | {j['location']} | {j['url']}")
