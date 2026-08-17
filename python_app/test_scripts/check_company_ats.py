import os
import sys
import argparse
import psycopg2
import requests
from urllib.parse import urlparse
from dotenv import load_dotenv

# Ensure output buffering doesn't block logging when redirecting to log.txt or pipes
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(line_buffering=True)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

load_dotenv(os.path.join(BASE_DIR, ".env"))

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*"
}


def get_db_connection():
    """Establishes connection to PostgreSQL database with fallback to localhost."""
    db_host = os.environ.get("POSTGRES_HOST", "postgres")
    user = os.environ.get("POSTGRES_USER", "root")
    password = os.environ.get("POSTGRES_PASSWORD", "root")
    dbname = os.environ.get("POSTGRES_DB", "jobapplication")
    port = os.environ.get("POSTGRES_PORT", "5432")

    try:
        conn = psycopg2.connect(
            host=db_host,
            user=user,
            password=password,
            database=dbname,
            port=port,
            connect_timeout=3
        )
    except psycopg2.OperationalError:
        if db_host != "localhost":
            conn = psycopg2.connect(
                host="localhost",
                user=user,
                password=password,
                database=dbname,
                port=port
            )
        else:
            raise
    conn.autocommit = True
    return conn


def extract_workday_url_company_name(workday_url: str):
    """
    Extracts the URL company name from a Workday API or web URL.
    E.g. https://cvshealth.wd1.myworkdayjobs.com/wday/cxs/cvshealth/CVS_Health_Careers -> 'cvshealth'
         https://cadence.wd1.myworkdayjobs.com/External_Careers -> 'cadence'
    """
    if not workday_url:
        return None
    try:
        parsed = urlparse(workday_url)
        path_parts = [p for p in parsed.path.split("/") if p]

        # Check if 'cxs' is present in path (e.g. /wday/cxs/cvshealth/CVS_Health_Careers)
        if "cxs" in path_parts:
            cxs_idx = path_parts.index("cxs")
            if cxs_idx + 1 < len(path_parts):
                return path_parts[cxs_idx + 1]

        # Fallback to netloc subdomain (e.g. cvshealth.wd1.myworkdayjobs.com)
        netloc = parsed.netloc.lower().replace("www.", "")
        if ".myworkdayjobs.com" in netloc or ".myworkday.com" in netloc:
            return netloc.split(".")[0]
        elif len(path_parts) > 0:
            return path_parts[0]
    except Exception:
        pass
    return None


def scrape_workday_no_filter(company: str, board: str, workday_url: str, max_jobs: int = None):
    """Scrapes Workday jobs without any filter."""
    base_api_url = workday_url
    if not base_api_url:
        if board:
            base_api_url = f"https://{board}.wd1.myworkdayjobs.com/wday/cxs/{board}/External_Careers"
        else:
            print(f"  [WORKDAY LOG] Company '{company}': Missing workday_url and board.", flush=True)
            return []

    query_url = f"{base_api_url.rstrip('/')}/jobs"
    all_jobs = []
    limit = 20
    offset = 0

    while True:
        payload = {
            "appliedFacets": {},
            "limit": limit,
            "offset": offset,
            "searchText": ""
        }
        try:
            r = requests.post(query_url, json=payload, headers=HEADERS, timeout=15)
            if r.status_code != 200:
                print(f"  [WORKDAY LOG] Company '{company}': HTTP {r.status_code} returned from {query_url}", flush=True)
                break
            data = r.json()
        except Exception as e:
            print(f"  [WORKDAY LOG] Company '{company}': Network error while querying {query_url}: {e}", flush=True)
            break

        postings = data.get("jobPostings", [])
        if not postings:
            break

        all_jobs.extend(postings)
        total = data.get("total", 0)

        # Print progress log periodically so it doesn't appear hung for large enterprise boards (e.g. 20,000+ jobs)
        if offset > 0 and (offset % 200 == 0 or offset + limit >= total):
            print(f"  [WORKDAY PROGRESS] Company '{company}': Scraped {len(all_jobs)}/{total} jobs...", flush=True)

        offset += limit

        if max_jobs and len(all_jobs) >= max_jobs:
            print(f"  [WORKDAY LOG] Company '{company}': Reached max_jobs limit of {max_jobs}.", flush=True)
            break

        if offset >= total or len(postings) < limit:
            break

    if len(all_jobs) == 0:
        print(f"  [WORKDAY LOG] Company '{company}': Nothing returned from {query_url}", flush=True)

    return all_jobs


def scrape_greenhouse_no_filter(company: str, board: str):
    """Scrapes Greenhouse jobs without any filter."""
    board_name = board if board else company.lower()
    url_api = f"https://boards-api.greenhouse.io/v1/boards/{board_name}/jobs"

    try:
        r = requests.get(url_api, headers=HEADERS, timeout=15)
        if r.status_code != 200:
            print(f"  [GREENHOUSE LOG] Company '{company}': HTTP {r.status_code} returned from {url_api}", flush=True)
            return []
        data = r.json()
        jobs = data.get("jobs", [])
    except Exception as e:
        print(f"  [GREENHOUSE LOG] Company '{company}': Network error while fetching {url_api}: {e}", flush=True)
        return []

    if len(jobs) == 0:
        print(f"  [GREENHOUSE LOG] Company '{company}': Nothing returned from {url_api}", flush=True)

    return jobs


def scrape_lever_no_filter(company: str, board: str):
    """Scrapes Lever jobs without any filter."""
    board_name = board if board else company.lower()
    api_url = f"https://api.lever.co/v0/postings/{board_name}?mode=json"

    try:
        r = requests.get(api_url, headers=HEADERS, timeout=15)
        if r.status_code != 200:
            print(f"  [LEVER LOG] Company '{company}': HTTP {r.status_code} returned from {api_url}", flush=True)
            return []
        data = r.json()
        if not isinstance(data, list):
            print(f"  [LEVER LOG] Company '{company}': Unexpected payload response type {type(data)} from {api_url}", flush=True)
            return []
        jobs = data
    except Exception as e:
        print(f"  [LEVER LOG] Company '{company}': Network error while fetching {api_url}: {e}", flush=True)
        return []

    if len(jobs) == 0:
        print(f"  [LEVER LOG] Company '{company}': Nothing returned from {api_url}", flush=True)

    return jobs


def scrape_ashby_no_filter(company: str, board: str):
    """Scrapes Ashby jobs without any filter."""
    board_name = board if board else company.lower()
    url_graphql = "https://jobs.ashbyhq.com/api/non-user-graphql"

    payload = {
        "operationName": "ApiJobBoardWithTeams",
        "variables": {
            "organizationHostedJobsPageName": board_name
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

    try:
        r = requests.post(url_graphql, json=payload, headers=HEADERS, timeout=15)
        if r.status_code != 200:
            print(f"  [ASHBY LOG] Company '{company}': HTTP {r.status_code} returned from {url_graphql}", flush=True)
            return []
        data = r.json()
        job_board = data.get("data", {}).get("jobBoard", {}) or {}
        jobs = job_board.get("jobPostings", [])
    except Exception as e:
        print(f"  [ASHBY LOG] Company '{company}': Network error while querying {url_graphql}: {e}", flush=True)
        return []

    if len(jobs) == 0:
        print(f"  [ASHBY LOG] Company '{company}': Nothing returned for board '{board_name}' from {url_graphql}", flush=True)

    return jobs


def check_company_ats(start_row: int = 1, max_jobs: int = None):
    """
    Checks company_ats table for companies using workday, greenhouse, lever, or ashby.
    Scrapes jobs without any filter.
    Logs if nothing returned or network error occurs.
    For workday, checks if URL company name matches the board column and logs if not.
    
    :param start_row: 1-indexed row number to start processing from (default: 1).
    :param max_jobs: optional limit on maximum jobs to fetch per company.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    query = """
        SELECT company, ats, board, workday_url
        FROM company_ats
        WHERE LOWER(ats) IN ('workday', 'greenhouse', 'lever', 'ashby')
        ORDER BY ats, company;
    """
    cur.execute(query)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    print(f"Found {len(rows)} company_ats entries matching Workday, Greenhouse, Lever, or Ashby.", flush=True)

    if start_row < 1:
        start_row = 1

    start_idx = start_row - 1
    rows_to_process = rows[start_idx:]

    if start_row > 1:
        print(f"Starting check from row {start_row} ({len(rows_to_process)} entries remaining).\n", flush=True)
    else:
        print("", flush=True)

    summary = {
        "total_entries": len(rows),
        "processed_count": len(rows_to_process),
        "success": 0,
        "empty_or_error": 0,
        "workday_mismatches": 0
    }

    for idx, (company, ats, board, workday_url) in enumerate(rows_to_process, start=start_row):
        ats_lower = (ats or "").strip().lower()
        company_str = (company or "").strip()
        board_str = (board or "").strip()
        workday_url_str = (workday_url or "").strip()

        print(f"[{idx}/{len(rows)}] Company: '{company_str}' | ATS: {ats} | Board: '{board_str}'", flush=True)

        # Workday URL company name validation against board column
        if ats_lower == "workday":
            url_company = extract_workday_url_company_name(workday_url_str)
            if url_company:
                if url_company.lower() != board_str.lower():
                    print(f"  [WORKDAY MISMATCH LOG] Company '{company_str}': URL company name '{url_company}' does NOT match board column '{board_str}' (workday_url: {workday_url_str})", flush=True)
                    summary["workday_mismatches"] += 1
                else:
                    print(f"  [WORKDAY MATCH] URL company name '{url_company}' matches board column '{board_str}'", flush=True)
            else:
                print(f"  [WORKDAY LOG] Company '{company_str}': Unable to extract URL company name from workday_url '{workday_url_str}'", flush=True)

        # Scrape without any filter
        jobs = []
        try:
            if ats_lower == "workday":
                jobs = scrape_workday_no_filter(company_str, board_str, workday_url_str, max_jobs=max_jobs)
            elif ats_lower == "greenhouse":
                jobs = scrape_greenhouse_no_filter(company_str, board_str)
            elif ats_lower == "lever":
                jobs = scrape_lever_no_filter(company_str, board_str)
            elif ats_lower == "ashby":
                jobs = scrape_ashby_no_filter(company_str, board_str)
        except Exception as err:
            print(f"  [SCRAPE ERROR] Company '{company_str}': {err}", flush=True)

        if jobs:
            print(f"  -> Scraped {len(jobs)} jobs.", flush=True)
            summary["success"] += 1
        else:
            summary["empty_or_error"] += 1

        print("-" * 60, flush=True)

    print("\n" + "=" * 60, flush=True)
    print("CHECK COMPLETE SUMMARY:", flush=True)
    print(f"Total Entries in DB: {summary['total_entries']}", flush=True)
    print(f"Companies Checked (from row {start_row}): {summary['processed_count']}", flush=True)
    print(f"Successfully Scraped (>= 1 job): {summary['success']}", flush=True)
    print(f"Empty / Network Error Count: {summary['empty_or_error']}", flush=True)
    print(f"Workday Board Column Mismatches: {summary['workday_mismatches']}", flush=True)
    print("=" * 60, flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Check ATS entries for companies.")
    parser.add_argument(
        "--start-row", "-s",
        type=int,
        default=1,
        help="Row index to start checking from (1-indexed, default: 1)"
    )
    parser.add_argument(
        "--max-jobs", "-m",
        type=int,
        default=None,
        help="Maximum jobs to scrape per company before stopping pagination (optional)"
    )
    args = parser.parse_args()
    check_company_ats(start_row=args.start_row, max_jobs=args.max_jobs)
