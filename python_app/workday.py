from preprocess_job import extract_post_date
from datetime import datetime, timedelta
from urllib.parse import urlparse, urljoin
import requests
import json

COMPANY_TO_URL = {
    "Motorola Solutions": "https://motorolasolutions.wd5.myworkdayjobs.com/wday/cxs/motorolasolutions/Careers",
    "NVIDIA": "https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite",
    "Blue Origin": "https://blueorigin.wd5.myworkdayjobs.com/wday/cxs/blueorigin/BlueOrigin",
    "NXP": "https://nxp.wd3.myworkdayjobs.com/wday/cxs/nxp/careers",
    "Boeing": "https://boeing.wd1.myworkdayjobs.com/wday/cxs/boeing/EXTERNAL_CAREERS",
}

BOARD_TO_COMPANY = {
    "motorolasolutions": "Motorola Solutions",
    "nvidia": "NVIDIA",
    "blueorigin": "Blue Origin",
    "nxp": "NXP",
    "boeing": "Boeing",
}

usa_results = []
intern_results = []

def collect_descriptors(obj, current_facet=None):
    if isinstance(obj, dict):
        if "facetParameter" in obj:
            current_facet = obj["facetParameter"]

        if "descriptor" in obj and "id" in obj:
            desc = obj["descriptor"]
            # Check USA terms
            if any(term in desc for term in ["USA", "United States", "United States of America"]):
                usa_results.append({
                    "facet": current_facet,
                    "descriptor": desc,
                    "id": obj["id"],
                    "count": obj.get("count", 0)
                })
            # Check Intern term
            if "Intern" in desc:
                intern_results.append({
                    "facet": current_facet,
                    "descriptor": desc,
                    "id": obj["id"],
                    "count": obj.get("count", 0)
                })

        for value in obj.values():
            collect_descriptors(value, current_facet)

    elif isinstance(obj, list):
        for item in obj:
            collect_descriptors(item, current_facet)

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
    company = BOARD_TO_COMPANY.get(company_tag, company_tag.capitalize())

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
    
    if company_tag not in BOARD_TO_COMPANY:
        raise ValueError(f"Company board '{company_tag}' is not supported under Workday.")
    
    # Extract the job title
    path_parts = parsed.path.strip("/").split("/")
    job_title = path_parts[-1]
    
    # Look up BOARD_TO_COMPANY to get company name
    company_name = BOARD_TO_COMPANY.get(company_tag)
    if not company_name:
        company_name = company_tag.capitalize()
        
    # Get the base API URL from COMPANY_TO_URL
    base_url = COMPANY_TO_URL.get(company_name)
    if not base_url:
        site = path_parts[1]
        base_url = f"{parsed.scheme}://{parsed.netloc}/wday/cxs/{company_tag}/{site}"
        
    api_job_url = f"{base_url}/job/{job_title}"
    print(f"API URL: {api_job_url}")
    
    job = extract_page(api_job_url)
    
    print(f"{job['title']} | {job['company']} | {job['description'][:100]} | {job['url']} | {job['location']} | {job['post_date']}")

    return job

def scrape(company, ws=None):
    usa_results.clear()
    intern_results.clear()
    base_api_url = COMPANY_TO_URL.get(company)
    if not base_api_url:
        print(f"Company {company} not found in COMPANY_TO_URL.")
        return []
    
    query_url = f"{base_api_url}/jobs"
    print(f"Querying jobs from {query_url}...")
    
    payload = {
        "appliedFacets": {},
        "searchText": ""
    }
    
    try:
        r = requests.post(query_url, json=payload)
        data = r.json()
    except Exception as e:
        print(f"Failed to query {query_url}: {e}")
        return []

    collect_descriptors(data)

    best_usa = max(usa_results, key=lambda x: x["count"]) if usa_results else None
    best_intern = max(intern_results, key=lambda x: x["count"]) if intern_results else None

    print("--- Best USA Match ---")
    print(f"Facet: {best_usa['facet']}")
    print(f"Descriptor: {best_usa['descriptor']}")
    print(f"Count: {best_usa['count']}")

    print("--- Best Intern Match ---")
    print(f"Facet: {best_intern['facet']}")
    print(f"Descriptor: {best_intern['descriptor']}")
    print(f"Count: {best_intern['count']}")

    filters = {}
    if best_usa:
        filters[best_usa["facet"]] = [best_usa["id"]]
    if best_intern:
        filters[best_intern["facet"]] = [best_intern["id"]]

    limit = 20
    offset = 0
    job_postings = []
    
    while True:
        payload2 = {
            "appliedFacets": filters,
            "limit": limit,
            "offset": offset,
            "searchText": ""
        }
        try:
            r2 = requests.post(query_url, json=payload2)
            data2 = r2.json()
        except Exception as e:
            print(f"Failed to query filtered jobs at offset {offset}: {e}")
            break
            
        postings = data2.get('jobPostings', [])
        job_postings.extend(postings)
        
        total = data2.get('total', 0)
        if len(job_postings) >= total or not postings:
            break
            
        offset += limit
        
    print(f"Found {len(job_postings)} jobs matching filters.")
    
    scraped_jobs = []
    for job_dict in job_postings:
        external_path = job_dict['externalPath']
        parts = external_path.split("/")
        clean_external_path = f"/job/{parts[-1]}"
        job_api_url = base_api_url + clean_external_path
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
    # scrape_from_url("https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/Principal-Software-Engineer--Rack-Scale-System-Software---CSP-Engagements_JR2020316?source=jobboardlinkedin&locationHierarchy1=2fcb99c455831013ea52fb338f2932d8")
    
    print("\n" + "="*50 + "\nTesting scrape...\n" + "="*50)
    nxp_jobs = scrape("NVIDIA")
    print(f"\nScraped {len(nxp_jobs)} jobs:")
