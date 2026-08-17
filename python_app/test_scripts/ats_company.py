# from ats_scrapers import get_scraper_for_url

# scraper = get_scraper_for_url("https://jobs.ashbyhq.com/openai")
# jobs = scraper.fetch()

from ats_scrapers import find_company
from ats_scrapers.scrapers import get_scraper

df = find_company("VMware")          # → ats="ashby", slug="openai", url=...
# scraper = get_scraper("workday", "https://nvidia.wd5.myworkdayjobs.com/nvidiaexternalcareersite")
# jobs = scraper.fetch()

print(df)