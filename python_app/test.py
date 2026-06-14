from linkedin import scrape_from_url, get_auth
import json

url = "https://www.linkedin.com/jobs/search/?currentJobId=4400794277&distance=0&location=austin%20tx&origin=JOB_SEARCH_PAGE_JOB_FILTER"
# get_auth()
job = scrape_from_url(url)
print(json.dumps(job, indent=2))