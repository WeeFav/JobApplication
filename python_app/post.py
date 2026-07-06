import requests
import json
from bs4 import BeautifulSoup
import requests

# company = "shieldai"
company = "zoox"

url = f"https://api.lever.co/v0/postings/{company}?mode=json"

jobs = requests.get(url).json()

print(jobs[0].keys())

from datetime import datetime

ts = 1774284528375 / 1000
dt = datetime.utcfromtimestamp(ts)

print(dt)