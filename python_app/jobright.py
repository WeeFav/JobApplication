from playwright.sync_api import sync_playwright, Error
import time
import math
import pandas as pd
import traceback
from queue import Queue
from preprocess_job import extract_post_date
import json

def get_auth():
    """Only need when need to sign into google"""
    with sync_playwright() as playwright:
        context = playwright.chromium.launch_persistent_context(
            user_data_dir="./user-data",
            channel="chrome",
            headless=False,
            no_viewport=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        page = context.new_page()
        page.goto("https://jobright.ai/jobs/recommend")
        
        page.pause()
        
        context.storage_state(path="auth/jobright_auth.json")
  
def extract_page(page):
    company = page.locator("h2.index_company-row__vOzgg").inner_text().split("\n")[0]
    post_time = page.locator("h2.index_company-row__vOzgg").inner_text().split("\n")[1][2:]
    post_date = extract_post_date(post_time)
    title = page.locator("h1.index_job-title__sStdA").text_content()
    location = page.locator("div.index_job-metadata-row__jNc9H > div").first.inner_text()
    url = page.locator("a.index_origin__7NnDG").get_attribute("href")

    description = ""
    summary = page.locator("p.index_company-summary__8nWbU").inner_text()            
    description += "Summary: \n" + summary + "\n\n"
    
    # Responsibilities
    try:
        responsibility = page.locator("xpath=//div[preceding-sibling::div[h2[text()='Responsibilities']]]").inner_text()
        description += "Responsibilities: \n" + responsibility + "\n\n"
    except Error as e:
        print(f"Failed to scrape Responsibilities: {e}")
    
    # Qualification
    try: 
        description += "Qualification: \n"
        
        qualification_locator = page.locator("xpath=//section[@id='skills-section']//div[@class='index_flex-col__Y_QL8']")
        for i in range(qualification_locator.count()):
            sub_title = qualification_locator.nth(i).locator("h4.index_qualifications-sub-title__IA6rq").inner_text()
            list_divs = qualification_locator.nth(i).locator('xpath=/div')
            required_qualification = "\n".join(["  -" + list_divs.nth(i).inner_text() for i in range(list_divs.count())])
            description += sub_title + "\n"
            description += required_qualification + "\n\n"
    except Error as e:
        print(f"Failed to scrape Qualification: {e}")
        
    return {
        "title": title,
        "company": company,
        "description": description,
        "url": url,
        "location": location,
        "post_date": post_date
    }
    
def scrape(jobs_to_scrape, ws, type='recommend'):
    # if type == 'recommend':
    #     jobs_per_page = 10
    # elif type == 'applied':
    #     jobs_per_page = 20
        
    # pages = math.ceil(jobs_to_scrape / jobs_per_page)
    jobs = []
    
    with sync_playwright() as playwright:
        # open browser and navigate to jobright
        browser = playwright.chromium.launch(
            channel="chrome",
            headless=False,
        )
        context = browser.new_context(storage_state="auth/jobright_auth.json")
        page = context.new_page()

        page.goto(f"https://jobright.ai/jobs/{type}")
        
        # scroll until all jobs are visible
        scroll_locator = page.locator("div#scrollableDiv")
        scroll_locator.wait_for()
        job_list_locator = scroll_locator.locator("xpath=/div")
        divs = job_list_locator.locator("xpath=/div")
        
        prev_index = -1
        job_ids = []
        
        while prev_index + 1 < jobs_to_scrape:
            time.sleep(2) # wait for jobs to load
            for i in range(divs.count()):
                div = divs.nth(i)
                data_index = div.get_attribute("data-index")
                if data_index and int(data_index) > prev_index and int(data_index) < jobs_to_scrape:
                    job_id = div.locator("xpath=/div").get_attribute("id")
                    print(data_index, job_id)
                    job_ids.append(job_id)
                    prev_index = int(data_index)                    
            scroll_locator.evaluate("(el) => { el.scrollTop = el.scrollHeight; }")
                    
        # scape each job
        for job_id in job_ids:
            if jobs_to_scrape == 0:
                break
            page.goto(f"https://jobright.ai/jobs/info/{job_id}")   
            job = extract_page(page)
            jobs.append(job)
            ws.send(json.dumps({"type": "scrape", "action": "update"}))
            
            jobs_to_scrape -= 1
            print(f"{i} | {job['title']} | {job['company']} | {job['location']} | {job['post_date']}")
        
        context.close()
        browser.close()     
    return jobs
    
def scrape_from_url(url):
    with sync_playwright() as playwright:     
        # open browser and navigate to jobright
        browser = playwright.chromium.launch(
            channel="chrome",
            headless=False,
        )
        context = browser.new_context(storage_state="auth/jobright_auth.json")
        page = context.new_page()

        page.goto(url)
    
        job = extract_page(page)
        
        print(f"{job['title']} | {job['company']} | {job['location']} | {job['post_date']}")
                            
        context.close()
        browser.close()
    return job

if __name__ == '__main__':
    # get_auth()
    q = Queue()
    scrape_jobright(10, q)