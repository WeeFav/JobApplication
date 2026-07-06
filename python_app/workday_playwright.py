from preprocess_job import extract_post_date
from datetime import datetime, timedelta
from playwright.sync_api import sync_playwright
from urllib.parse import urlparse, urljoin

def extract_page(page, company):
    title_locator = page.locator('h2[data-automation-id="jobPostingHeader"]')
    title_locator.wait_for()
    title = title_locator.inner_text().strip()
    
    # location: all <dd> tags under div with data-automation-id="locations"
    location_locators = page.locator('div[data-automation-id="job-posting-details"] div[data-automation-id="locations"] dd')
    locations = location_locators.all_inner_texts()
    location = ", ".join([loc.strip() for loc in locations if loc.strip()])
    
    # post_date: all <dd> tags under div with data-automation-id="postedOn"
    post_date_locators = page.locator('div[data-automation-id="job-posting-details"] div[data-automation-id="postedOn"] dd')
    post_date_texts = post_date_locators.all_inner_texts()
    post_date_raw = ", ".join([text.strip() for text in post_date_texts if text.strip()])
    
    post_date = extract_post_date(post_date_raw.lower())
    if not post_date:
        # Fallback for "Today", "Yesterday" or similar formats not parsed by extract_post_date
        today = datetime.today()
        if "today" in post_date_raw.lower():
            post_date = today.strftime('%Y-%m-%d')
        elif "yesterday" in post_date_raw.lower():
            post_date = (today - timedelta(days=1)).strftime('%Y-%m-%d')
            
    # description: all text under div with data-automation-id="jobPostingDescription"
    description_locator = page.locator('div[data-automation-id="jobPostingDescription"]')
    description = description_locator.inner_text().strip()
    
    return {
        "title": title,
        "company": company,
        "description": description,
        "url": page.url,
        "location": location,
        "post_date": post_date
    }

def scrape_from_url(url, company=None):
    print(f"scraping {url}")
    if not company:
        netloc = urlparse(url).netloc.lower()
        netloc = netloc.replace("www.", "")
        company = netloc.split(".")[0].capitalize() # Capitalize company name for a cleaner look
        
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            channel="chrome",
            headless=False,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = browser.new_context(no_viewport=True)
        page = context.new_page()

        page.goto(url, wait_until="domcontentloaded")
        
        job = extract_page(page, company)
        
        print(f"{job['title']} | {job['company']} | {job['description'][:100]} | {job['url']} | {job['location']} | {job['post_date']}")
                            
        context.close()
        browser.close()
    return job

def scrape(url):
    print(f"Starting scrape for Workday site: {url}")
    netloc = urlparse(url).netloc.lower()
    netloc = netloc.replace("www.", "")
    company = netloc.split(".")[0].capitalize()
    
    saved_urls = []
    
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            channel="chrome",
            headless=False,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = browser.new_context(no_viewport=True)
        page = context.new_page()
        
        page.goto(url, wait_until="domcontentloaded")
        
        # 1. locate nav element with aria-label="pagination"
        nav = page.locator('nav[aria-label="pagination"]')
        try:
            nav.wait_for(timeout=5000)
            # 2. locate ol under nav, and find the last li under ol
            ol = nav.locator('ol')
            lis = ol.locator('li')
            # 3. read the text of the button under the last li, that is the last page
            last_page = int(lis.last.locator('button').inner_text().strip())
            print(f"Detected {last_page} pages of jobs.")
        except Exception:
            last_page = 1
            print("No pagination nav detected or timed out. Defaulting to 1 page.")
            
        current_page = 1
        while current_page <= last_page:
            print(f"Scraping page {current_page} of {last_page}...")
            # locate section element with data-automation-id="jobResults"
            section = page.locator('section[data-automation-id="jobResults"]')
            section.wait_for(timeout=15000)
            
            # locate ul element under section
            ul = section.locator('ul')
            ul.locator('li').first.wait_for(timeout=15000)
            
            # there are many li element under ul.
            lis = ul.locator('li')
            count = lis.count()
            
            for i in range(count):
                li = lis.nth(i)
                # locate the <a> element with data-automation-id="jobTitle"
                a = li.locator('a[data-automation-id="jobTitle"]')
                if a.count() > 0:
                    title = a.inner_text().strip()
                    # 4. if the text of <a> contains "software", save the href in <a> in a list
                    if "software" in title.lower():
                        href = a.get_attribute('href')
                        if href:
                            # Resolve relative URLs
                            full_url = urljoin(url, href)
                            saved_urls.append(full_url)
            
            # 4. while page < last page, after scraping current page, locate button with data-uxi-element-id="next" under the nav and press to go to next page
            if current_page < last_page:
                next_btn = nav.locator('button[data-uxi-element-id="next"]')
                next_btn.click()
                # Wait for next page to load results
                page.wait_for_timeout(2000)
                
            current_page += 1
            
        print(f"Found {len(saved_urls)} software jobs to scrape.")
        
        jobs = []
        # 5. after all li has been evaluated, go to each saved url, and call extract_page
        for job_url in saved_urls:
            try:
                page.goto(job_url, wait_until="domcontentloaded")
                job = extract_page(page, company)
                jobs.append(job)
                print(f"Scraped: {job['title']} | {job['company']} | {job['location']} | {job['post_date']}")
            except Exception as e:
                print(f"Failed to scrape {job_url}: {e}")
                
        context.close()
        browser.close()
        
    return jobs

if __name__ == '__main__':
    # Test scrape_from_url
    # scrape_from_url("https://generalmotors.wd5.myworkdayjobs.com/Careers_GM/job/Sunnyvale-California-United-States-of-America/Entry-Level-Developer---Simulation-Platform--Galileo-_JR-202611523?source=LinkedIn")
    
    # Test scrape (multiple jobs)
    scrape("https://generalmotors.wd5.myworkdayjobs.com/en-US/Careers_GM/?q=software+intern")
