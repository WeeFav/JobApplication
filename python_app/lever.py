import requests
import json
from bs4 import BeautifulSoup
from urllib.parse import urlparse

BOARD_TO_COMPANY = {
    "zoox": "Zoox",
    "shieldai": "Shield AI"
}

COMPANY_TO_BOARD = {
    "Zoox": "zoox",
    "Shield AI": "shieldai"
}

def extract_page(raw_job_dict):
    title = raw_job_dict.get("text", "")
    url = raw_job_dict.get("hostedUrl", "")
    location = raw_job_dict.get("categories", {}).get("location", "")
    
    # Extract company from URL path
    parsed = urlparse(url)
    company_tag = parsed.path.strip("/").split("/")[0]
    company = BOARD_TO_COMPANY.get(company_tag, company_tag.capitalize())
    
    description = ""
    post_date = ""
    
    try:
        r = requests.get(url)
        soup = BeautifulSoup(r.text, "html.parser")
        scripts = soup.find_all("script", {"type": "application/ld+json"})
        for s in scripts:
            data = json.loads(s.string)
            if data.get("@type") == "JobPosting":
                description = data.get("description", "")
                date_posted_raw = data.get("datePosted", "")
                post_date = date_posted_raw.split("T")[0] if "T" in date_posted_raw else date_posted_raw
                break
    except Exception as e:
        print(f"Failed to fetch/parse HTML for {url}: {e}")
        
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
    company = path_parts[0]
    job_id = path_parts[1]
    
    if company not in BOARD_TO_COMPANY:
        raise ValueError(f"Company board '{company}' is not supported under Lever.")
    
    api_url = f"https://api.lever.co/v0/postings/{company}?mode=json"
    jobs = requests.get(api_url).json()
    
    raw_job_dict = None
    for job in jobs:
        if job.get("id") == job_id:
            raw_job_dict = job
            break
            
    if not raw_job_dict:
        print(f"Job posting {job_id} not found in {company} postings.")
        return None
        
    return extract_page(raw_job_dict)

def scrape(company, ws=None):
    company_board = COMPANY_TO_BOARD.get(company, company.lower())
    api_url = f"https://api.lever.co/v0/postings/{company_board}?mode=json"
    print(f"Querying jobs from {api_url}...")
    
    jobs = requests.get(api_url).json()
    
    filtered_jobs = []
    for job in jobs:
        # Filter for location in US using "country" field
        country = job.get("country") or ""
        is_us = country.lower() == "us" or country.lower() == "united states"
        
        # Filter for intern in "text" field (job title)
        title = job.get("text") or ""
        title_lower = title.lower()
        is_intern = "intern" in title_lower and "internal" not in title_lower and "international" not in title_lower
        
        if is_us and is_intern:
            filtered_jobs.append(job)
            
    print(f"Found {len(filtered_jobs)} matching jobs.")
    
    scraped_jobs = []
    for job in filtered_jobs:
        print(f"Scraping details for {job.get('text')}...")
        try:
            job_info = extract_page(job)
            scraped_jobs.append(job_info)
            if ws is not None:
                ws.send(json.dumps({"type": "scrape", "action": "update"}))
        except Exception as e:
            print(f"Failed to extract details for job {job.get('id')}: {e}")
            
    return scraped_jobs

if __name__ == '__main__':
    # Test scrape_from_url
    print("Testing scrape_from_url...")
    job = scrape_from_url("https://jobs.lever.co/zoox/a8097f44-025a-47f5-a2c9-183fb50782ab")
    if job:
        print(f"Scraped job: {job['title']} | {job['company']} | {job['location']} | {job['post_date']}")
        
    # Test scrape
    print("\nTesting scrape('Zoox')...")
    zoox_jobs = scrape("Zoox")
    print(f"Found {len(zoox_jobs)} jobs:")
    for j in zoox_jobs:
        print(f" - {j['title']} | {j['location']} | {j['url']}")
