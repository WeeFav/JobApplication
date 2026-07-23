from playwright.sync_api import sync_playwright, Playwright
import time
import math
import traceback
from queue import Queue
from preprocess_job import extract_post_date, extract_source_from_url
import json
import os
from dotenv import load_dotenv
import requests
import psycopg2

# Ensure the persistent user data directory path is absolute
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USER_DATA_DIR = os.path.join(BASE_DIR, "user-data")

# Load environment variables from .env
load_dotenv(os.path.join(BASE_DIR, ".env"))

from urllib.parse import urlparse, parse_qs

def convert_workday_url(url):
    """
    Converts a standard Workday job URL to its corresponding API URL format.
    E.g., https://cadence.wd1.myworkdayjobs.com/External_Careers/job/AUSTIN-03/Software-Engineer-I_R53009-1?source=LinkedIn
    If base_only=True, returns the base API URL:
      https://cadence.wd1.myworkdayjobs.com/wday/cxs/cadence/External_Careers
    """
    parsed = urlparse(url)
    netloc = parsed.netloc.lower().replace("www.", "")
    company_tag = netloc.split(".")[0]
    
    # Split path and clean up empty parts
    path_parts = [p for p in parsed.path.split("/") if p]
    
    # Find the career site and job slug
    site = None
    job_slug = None
    
    if "job" in path_parts:
        job_idx = path_parts.index("job")
        if job_idx > 0:
            site = path_parts[job_idx - 1]
        job_slug = path_parts[-1]
    else:
        if len(path_parts) > 0:
            site = path_parts[0]
            
    if not site:
        site = "External_Careers"
        
    base_api_url = f"{parsed.scheme}://{parsed.netloc}/wday/cxs/{company_tag}/{site}"
    return base_api_url

def extract_ashby_board_name(url):
    """
    Extracts the company board name from an Ashby job URL.
    E.g.:
    - https://jobs.ashbyhq.com/SkyLink/48770cea-cbdc-402b-8450-4fe526d86690 -> SkyLink
    - https://www.fieldguide.io/careers?ashby_jid=47a2afc4-1075-4378-83bb-714543b6c272 -> fieldguide
    """
    parsed = urlparse(url)
    netloc = parsed.netloc.lower()
    if netloc.startswith("www."):
        netloc = netloc[4:]
        
    if "ashbyhq.com" in netloc:
        path_parts = [p for p in parsed.path.split("/") if p]
        if path_parts:
            return path_parts[0]
        return None
    else:
        # Custom domain fallback
        parts = netloc.split(".")
        subdomains_to_drop = {"careers", "jobs", "work", "recruiting", "about", "company", "info", "corp"}
        if len(parts) > 2 and parts[0] in subdomains_to_drop:
            return parts[1]
        return parts[0]

def extract_greenhouse_board_name(url):
    """
    Extracts the company board name from a Greenhouse job board or job posting URL,
    supporting both greenhouse.io domains and custom company domains.
    E.g.:
    - https://job-boards.greenhouse.io/cloudflare/jobs/7887609?gh_jid=7887609 -> cloudflare
    - https://www.pathai.com/career/job-post?gh_jid=8466724002 -> pathai
    """
    parsed = urlparse(url)
    # Check query parameters for boardId
    query_params = parse_qs(parsed.query)
    if "boardId" in query_params:
        return query_params["boardId"][0]
        
    netloc = parsed.netloc.lower()
    if netloc.startswith("www."):
        netloc = netloc[4:]
        
    if "greenhouse.io" in netloc:
        path_parts = [p for p in parsed.path.split("/") if p]
        if not path_parts:
            return None
            
        # Handle API urls: /v1/boards/{board_name}/jobs
        if len(path_parts) >= 3 and path_parts[0] == "v1" and path_parts[1] == "boards":
            return path_parts[2]
            
        # Handle embed format: /embed/{board_name}
        if path_parts[0] == "embed" and len(path_parts) > 1:
            return path_parts[1]
            
        return path_parts[0]
    else:
        # Custom domain (e.g. pathai.com or careers.pathai.com)
        parts = netloc.split(".")
        subdomains_to_drop = {"careers", "jobs", "work", "recruiting", "about", "company", "info", "corp"}
        if len(parts) > 2 and parts[0] in subdomains_to_drop:
            return parts[1]
        return parts[0]

def extract_lever_board_name(url):
    """
    Extracts the company board name from a Lever job board or job posting URL.
    E.g., https://jobs.lever.co/zoox/f4746da4-8eb8-43e2-b7ce-bf3c7cf9640d/apply -> zoox
    """
    parsed = urlparse(url)
    netloc = parsed.netloc.lower()
    if netloc.startswith("www."):
        netloc = netloc[4:]
        
    if "lever.co" in netloc:
        path_parts = [p for p in parsed.path.split("/") if p]
        if path_parts:
            return path_parts[0]
        return None
    else:
        # Custom domain fallback
        parts = netloc.split(".")
        subdomains_to_drop = {"careers", "jobs", "work", "recruiting", "about", "company", "info", "corp"}
        if len(parts) > 2 and parts[0] in subdomains_to_drop:
            return parts[1]
        return parts[0]

def sign_in(page, url):
    """Automate signing into LinkedIn using credentials from .env"""
    print("Signing into LinkedIn")
    
    email = os.getenv("LINKEDIN_EMAIL")
    password = os.getenv("LINKEDIN_PASSWORD")
    
    if not email or not password:
        raise ValueError("LINKEDIN_EMAIL and LINKEDIN_PASSWORD must be set in your .env file")
        
    sign_in_btn = page.get_by_role("button", name="Sign in with Email")
    try:
        # Wait up to 3 seconds for the sign-in button to be visible
        sign_in_btn.wait_for(state="visible", timeout=3000)
    except Exception:
        print("Sign-in button not found. Already signed in or on an authenticated page.")
        return
        
    sign_in_btn.click()
    page.locator("#csm-v2_session_key").filter(visible=True).fill(email)
    page.locator("#csm-v2_session_password").filter(visible=True).fill(password)
    page.locator(".sign-in-form__submit-btn--full-width").filter(visible=True).click()
    page.goto(url, wait_until="domcontentloaded")

def extract_page(page):
    company = page.locator("div.job-details-jobs-unified-top-card__company-name").inner_text()
        
    apply_locator = page.locator("button#jobs-apply-button-id").first
    apply_locator.wait_for()
    apply_text = apply_locator.locator("span.artdeco-button__text").inner_text()
    
    source = None
    board = None
    if apply_text == "Apply":
        try:
            with page.expect_popup() as popup_info:
                apply_locator.click()
            new_page = popup_info.value
            url = new_page.url
            new_page.close()

            source = extract_source_from_url(url)
            if source == 'workday':
               board = convert_workday_url(url)
            elif source == 'greenhouse':
                board = extract_greenhouse_board_name(url)
            elif source == 'lever':
                board = extract_lever_board_name(url)
            elif source == 'ashby':
                board = extract_ashby_board_name(url)
            if source not in ['workday', 'greenhouse', 'lever', 'ashby']:
                source = None

        except TimeoutError:
            print("Timeout: No popup appeared within 30 seconds")
            url = page.url
    elif apply_text == "Easy Apply":
        url = page.url
            
    return {
        "company": company,
        "url": url,
        "source": source,
        "board": board
    }
    
def scrape(jobs_to_scrape, ws=None):
    print("Start LinkedIn scrape")
    jobs_per_page = 25
    pages = math.ceil(jobs_to_scrape / jobs_per_page)
    jobs = []
    
    # Establish DB connection and load existing companies into a set
    existing_companies = set()
    conn = None
    cursor = None
    try:
        db_host = os.environ.get("POSTGRES_HOST", "postgres")
        try:
            conn = psycopg2.connect(
                host=db_host,
                user=os.environ["POSTGRES_USER"],
                password=os.environ["POSTGRES_PASSWORD"],
                database=os.environ["POSTGRES_DB"],
                port=os.environ["POSTGRES_PORT"]
            )
        except psycopg2.OperationalError as op_err:
            if db_host != "localhost":
                print(f"Failed to connect to DB host '{db_host}'. Trying fallback to 'localhost'...")
                conn = psycopg2.connect(
                    host="localhost",
                    user=os.environ["POSTGRES_USER"],
                    password=os.environ["POSTGRES_PASSWORD"],
                    database=os.environ["POSTGRES_DB"],
                    port=os.environ["POSTGRES_PORT"]
                )
            else:
                raise op_err
                
        conn.autocommit = True
        cursor = conn.cursor()
        cursor.execute("SELECT company FROM company_ats")
        existing_companies = {row[0] for row in cursor.fetchall()}
        print(f"Loaded {len(existing_companies)} existing companies from database.")
    except Exception as e:
        print(f"Warning: Database setup failed: {e}. Scraping will continue without saving to DB.")
    
    with sync_playwright() as playwright:     
        browser = playwright.chromium.launch(
            channel="chrome",
            headless=False,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = browser.new_context(
            storage_state=os.path.join(BASE_DIR, "auth", "linkedin_auth.json"),
            no_viewport=True
        )
        page = context.new_page()

        page.goto("https://www.linkedin.com/jobs/search/?currentJobId=4406691082&geoId=103644278&keywords=software%20engineer&origin=JOB_SEARCH_PAGE_SEARCH_BUTTON&refresh=true", wait_until="domcontentloaded")
        
        sign_in(page, "https://www.linkedin.com/jobs/search/?currentJobId=4406691082&geoId=103644278&keywords=software%20engineer&origin=JOB_SEARCH_PAGE_SEARCH_BUTTON&refresh=true")

        for page_num in range(1, pages + 1):
            scroll_locator = page.locator("xpath=//div[contains(@class, 'scaffold-layout__list ')]/div")
            ul_locator = page.locator("xpath=//div[contains(@class, 'scaffold-layout__list ')]/div/ul")
            ul_locator.wait_for()
            
            # get job list
            lis = ul_locator.locator("xpath=/li")

            print(f"number of job on this page: {lis.count()}")
            
            for i in range(lis.count()):
                if jobs_to_scrape == 0:
                    break
                li_locator = lis.nth(i) 
                li_locator.click()
                                
                job = extract_page(page)
                jobs.append(job)
                
                # Save to database if cursor is active, company not in existing_companies set, and source is a supported ATS
                if cursor and job.get("company"):
                    comp_name = job["company"].strip()
                    if len(comp_name) > 150:
                        comp_name = comp_name[:150]
                    
                    ats_val = job.get("source")
                    if comp_name and comp_name not in existing_companies and ats_val in ['workday', 'ashby', 'lever', 'greenhouse']:
                        if len(ats_val) > 150:
                            ats_val = ats_val[:150]
                        meta_val = job.get("board")
                        try:
                            cursor.execute(
                                "INSERT INTO company_ats (company, ats, meta) VALUES (%s, %s, %s)",
                                (comp_name, ats_val, meta_val)
                            )
                            existing_companies.add(comp_name)
                            print(f"Saved to DB: {comp_name} | {ats_val} | {meta_val}")
                        except Exception as db_err:
                            print(f"Database insert error for '{comp_name}': {db_err}")
                
                if ws is not None:
                    ws.send(json.dumps({"type": "scrape", "action": "update"})) 
                
                jobs_to_scrape -= 1
                print(f"{i} | {job['company']} | {job['source']} | {job['board']} | {job['url']}")
                
                # need to scroll because linkedin has a weird issue where job not in view will not get scraped
                scroll_locator.evaluate("(el) => el.scrollBy(0, 132)")
            
            # click pagination
            if page_num != pages:
                pagination_locator = page.locator("ul.jobs-search-pagination__pages")
                pagination_locator.get_by_text(f"{str(page_num + 1)}").click()    
                            
        context.close()
        browser.close()
        
    if cursor:
        cursor.close()
    if conn:
        conn.close()
        
    return jobs
     
if __name__ == '__main__':
    scrape(40)

    # url_graphql = "https://jobs.ashbyhq.com/api/non-user-graphql"
    
    # payload = {
    #     "operationName": "ApiJobBoardWithTeams",
    #     "variables": {
    #         "organizationHostedJobsPageName": "OpenAI"
    #     },
    #     "query": """
    #     query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
    #       jobBoard: jobBoardWithTeams(
    #         organizationHostedJobsPageName: $organizationHostedJobsPageName
    #       ) {
    #         jobPostings {
    #           id
    #           title
    #           locationName
    #           employmentType
    #         }
    #       }
    #     }
    #     """
    # }
    
    # r = requests.post(url_graphql, json=payload)
    # job_board = r.json().get("data", {}).get("jobBoard", {})
    # job_postings = job_board.get("jobPostings", [])
    # print((job_postings))