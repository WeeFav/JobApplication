import requests
import json
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from scrape_ats_helper import get_company_by_board, get_board_by_company, is_valid_job


def extract_page(company_board_name, job_posting_id):
    url_graphql = "https://jobs.ashbyhq.com/api/non-user-graphql"
    
    payload = {
        "operationName": "ApiJobPosting",
        "variables": {
            "organizationHostedJobsPageName": company_board_name,
            "jobPostingId": job_posting_id
        },
        "query": """
        query ApiJobPosting($organizationHostedJobsPageName: String!, $jobPostingId: String!) {
          jobPosting(
            organizationHostedJobsPageName: $organizationHostedJobsPageName
            jobPostingId: $jobPostingId
          ) {
            id
            title
            locationName
            employmentType
            descriptionHtml
          }
        }
        """
    }
    
    r = requests.post(url_graphql, json=payload)
    job_data = r.json().get("data", {}).get("jobPosting", {})
    
    title = job_data.get("title", "")
    location = job_data.get("locationName", "")
    description = job_data.get("descriptionHtml", "")
    
    db_company = get_company_by_board('ashby', company_board_name)
    company = db_company if db_company else company_board_name.capitalize()
    web_url = f"https://jobs.ashbyhq.com/{company_board_name}/{job_posting_id}"
    
    post_date = ""
    try:
        html = requests.get(web_url).text
        soup = BeautifulSoup(html, "html.parser")
        scripts = soup.find_all("script", {"type": "application/ld+json"})
        for s in scripts:
            data = json.loads(s.string)
            if data.get("@type") == "JobPosting":
                date_posted_raw = data.get("datePosted", "")
                post_date = date_posted_raw.split("T")[0] if "T" in date_posted_raw else date_posted_raw
                break
    except Exception as e:
        print(f"Failed to extract datePosted from HTML for {web_url}: {e}")
        
    return {
        "title": title,
        "company": company,
        "description": description,
        "url": web_url,
        "location": location,
        "post_date": post_date
    }

def scrape_from_url(url):
    print(f"scraping {url}")
    parsed = urlparse(url)
    path_parts = parsed.path.strip("/").split("/")
    company_board_name = path_parts[0]
    job_posting_id = path_parts[1]
    
    db_company = get_company_by_board('ashby', company_board_name)
    if not db_company:
        raise ValueError(f"Company board '{company_board_name}' is not supported under Ashby.")
        
    return extract_page(company_board_name, job_posting_id)

def scrape(company, ws=None):
    company_board_name = get_board_by_company('ashby', company)
    if not company_board_name:
        company_board_name = company.lower()
    url_graphql = "https://jobs.ashbyhq.com/api/non-user-graphql"
    
    payload = {
        "operationName": "ApiJobBoardWithTeams",
        "variables": {
            "organizationHostedJobsPageName": company_board_name
        },
        "query": """
        query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
          jobBoard: jobBoardWithTeams(
            organizationHostedJobsPageName: $organizationHostedJobsPageName
          ) {
            jobPostings {
              id
              title
              locationName
              employmentType
            }
          }
        }
        """
    }
    
    r = requests.post(url_graphql, json=payload)
    job_board = r.json().get("data", {}).get("jobBoard", {})
    job_postings = job_board.get("jobPostings", [])
    
    filtered_jobs = []
    for job in job_postings:
        location_name = job.get("locationName", "")
        title = job.get("title", "")
        
        if is_valid_job(title, location_name):
            filtered_jobs.append(job)
            
    print(f"Found {len(filtered_jobs)} matching jobs.")
    
    scraped_jobs = []
    for job in filtered_jobs:
        job_id = job.get("id")
        print(f"Scraping details for {job.get('title')}...")
        try:
            job_info = extract_page(company_board_name, job_id)
            scraped_jobs.append(job_info)
            if ws is not None:
                ws.send(json.dumps({"type": "scrape", "action": "update"}))
        except Exception as e:
            print(f"Failed to extract details for job {job_id}: {e}")
            
    return scraped_jobs

if __name__ == '__main__':
    # Test scrape_from_url
    # print("Testing scrape_from_url...")
    # job = scrape_from_url("https://jobs.ashbyhq.com/openai/de06790a-7243-4e33-a6f1-e7bd34009588")
    # print(f"Scraped job: {job['title']} | {job['company']} | {job['location']} | {job['post_date']}")
    
    # Test scrape
    print("\nTesting scrape...")
    openai_jobs = scrape("Snowflake")
    print(f"Found {len(openai_jobs)} jobs:")
    for j in openai_jobs:
        print(f" - {j['title']} | {j['location']} | {j['url']}")
