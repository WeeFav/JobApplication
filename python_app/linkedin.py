from playwright.sync_api import sync_playwright, Playwright
import time
import math
import traceback
from queue import Queue
from preprocess_job import extract_post_date
import json
import os
from dotenv import load_dotenv

# Ensure the persistent user data directory path is absolute
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USER_DATA_DIR = os.path.join(BASE_DIR, "user-data")

# Load environment variables from .env
load_dotenv(os.path.join(BASE_DIR, ".env"))

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

def get_auth():
    """Only need when need to sign into LinkedIn"""
    with sync_playwright() as playwright:
        context = playwright.chromium.launch_persistent_context(
            user_data_dir=USER_DATA_DIR,
            channel="chrome",
            headless=False,
            no_viewport=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        page = context.pages[0] if context.pages else context.new_page()
        page.goto("https://www.linkedin.com/")
        
        page.pause()
        
        context.storage_state(path=os.path.join(BASE_DIR, "auth", "linkedin_auth.json"))
        context.close()

def extract_page(page):
    title = page.locator("div.job-details-jobs-unified-top-card__job-title").inner_text()
    company = page.locator("div.job-details-jobs-unified-top-card__company-name").inner_text()
    
    details_locator = page.locator("xpath=//div[contains(@class, 'job-details-jobs-unified-top-card__tertiary-description-container')]/span")
    location = details_locator.locator("xpath=./span[1]").inner_text()
    post_time = details_locator.locator("xpath=./span[3]").inner_text()                
    post_date = extract_post_date(post_time)
    
    apply_locator = page.locator("button#jobs-apply-button-id").first
    apply_locator.wait_for()
    apply_text = apply_locator.locator("span.artdeco-button__text").inner_text()
    
    if apply_text == "Apply":
        try:
            with page.expect_popup() as popup_info:
                apply_locator.click()
            new_page = popup_info.value
            url = new_page.url
            new_page.close()
        except TimeoutError:
            print("Timeout: No popup appeared within 30 seconds")
            url = page.url
    elif apply_text == "Easy Apply":
        url = page.url
        
    # move down here so description have time to load
    description = page.locator("xpath=//div[@id='job-details']/div[@class='mt4']").inner_text()
    
    return {
            "title": title,
            "company": company,
            "description": description,
            "url": url,
            "location": location,
            "post_date": post_date
    }
    
def scrape(jobs_to_scrape, ws=None):
    print("Start LinkedIn scrape")
    jobs_per_page = 25
    pages = math.ceil(jobs_to_scrape / jobs_per_page)
    jobs = []
    
    with sync_playwright() as playwright:     
        browser = playwright.chromium.launch(
            channel="chrome",
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = browser.new_context(
            storage_state=os.path.join(BASE_DIR, "auth", "linkedin_auth.json"),
            no_viewport=True
        )
        page = context.new_page()

        page.goto("https://www.linkedin.com/jobs/search/?f_TPR=r604800&geoId=103644278&keywords=software%20internship&origin=JOB_SEARCH_PAGE_JOB_FILTER&refresh=true", wait_until="domcontentloaded")
        
        sign_in(page, "https://www.linkedin.com/jobs/search/?f_TPR=r604800&geoId=103644278&keywords=software%20internship&origin=JOB_SEARCH_PAGE_JOB_FILTER&refresh=true")

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
                if ws is not None:
                    ws.send(json.dumps({"type": "scrape", "action": "update"})) 
                
                jobs_to_scrape -= 1
                print(f"{i} | {job['title']} | {job['company']} | {job['location']} | {job['post_date']}")
                
                # need to scroll because linkedin has a weird issue where job not in view will not get scraped
                scroll_locator.evaluate("(el) => el.scrollBy(0, 132)")
            
            # click pagination
            if page_num != pages:
                pagination_locator = page.locator("ul.jobs-search-pagination__pages")
                pagination_locator.get_by_text(f"{str(page_num + 1)}").click()    
                            
        context.close()
        browser.close()
    return jobs
    
def scrape_from_url(url):
    print(f"scraping {url}")
    with sync_playwright() as playwright:     
        browser = playwright.chromium.launch(
            channel="chrome",
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = browser.new_context(
            storage_state=os.path.join(BASE_DIR, "auth", "linkedin_auth.json"),
            no_viewport=True
        )
        page = context.new_page()

        page.goto(url, wait_until="domcontentloaded")
    
        sign_in(page, url)

        job = extract_page(page)
        
        print(f"{job['title']} | {job['company']} | {job['location']} | {job['post_date']}")
                            
        context.close()
        browser.close()
    return job
                    
if __name__ == '__main__':
    # get_auth()
    scrape(5)
    # scrape_from_url("https://www.linkedin.com/jobs/search/?currentJobId=4432711572&f_TPR=r604800&geoId=103644278&keywords=software%20engineer%20intern&origin=JOB_SEARCH_PAGE_JOB_FILTER&refresh=true")