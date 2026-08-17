import os
import sys
import psycopg2
from urllib.parse import urlparse
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

def convert_workday_url(url):
    """
    Converts a standard Workday job URL to its corresponding base API URL format.
    E.g., https://cadence.wd1.myworkdayjobs.com/External_Careers/job/...
    -> ('cadence', 'https://cadence.wd1.myworkdayjobs.com/wday/cxs/cadence/External_Careers')
    """
    parsed = urlparse(url)
    netloc = parsed.netloc.lower().replace("www.", "")
    company_tag = netloc.split(".")[0]
    
    path_parts = [p for p in parsed.path.split("/") if p]
    
    site = None
    if "job" in path_parts:
        job_idx = path_parts.index("job")
        if job_idx > 0:
            site = path_parts[job_idx - 1]
    else:
        if len(path_parts) > 0:
            site = path_parts[0]
            
    if not site:
        site = "External_Careers"
        
    base_api_url = f"{parsed.scheme}://{parsed.netloc}/wday/cxs/{company_tag}/{site}"
    return company_tag, base_api_url


def get_db_connection():
    """Establishes connection to PostgreSQL database with fast localhost fallback."""
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
            connect_timeout=2
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


def process_workday_urls(file_path: str = None):
    """
    Reads workday_url.txt, extracts Workday URLs, converts each to base_api_url
    using convert_workday_url(), matches the company in company_ats table,
    and updates/inserts the workday_url in the PostgreSQL database.
    """
    if not file_path:
        file_path = os.path.join(BASE_DIR, "workday_url.txt")

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    print(f"Reading Workday URLs from: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        lines = [line.strip() for line in f if line.strip()]

    company_names = [line.strip('"') for line in lines if line.startswith('"')]
    urls = [line for line in lines if line.startswith("http")]

    print(f"Found {len(company_names)} company names and {len(urls)} Workday URLs in file.")

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT company, ats, board, workday_url FROM company_ats;")
    db_rows = cur.fetchall()

    name_to_row = {r[0].lower(): r for r in db_rows}
    board_to_row = {}
    for r in db_rows:
        if r[2]:
            board_to_row[r[2].lower()] = r
            board_to_row[r[2].lower().replace("-", "")] = r

    tag_aliases = {
        "wf": ["wells fargo", "wells fargo advisors"],
        "snapchat": ["snap inc.", "snapchat", "snap"],
        "amat": ["applied materials"],
        "sec": ["samsung"],
        "sonyglobal": ["sony"],
        "veradigm": ["veradigm", "allscripts"],
    }

    updated_count = 0
    inserted_count = 0

    for idx, url in enumerate(urls, 1):
        company_tag, base_api_url = convert_workday_url(url)
        tag_clean = company_tag.lower().replace("-", "")

        matched_row = None

        # 1. Alias matching
        if company_tag.lower() in tag_aliases:
            for alias in tag_aliases[company_tag.lower()]:
                if alias.lower() in name_to_row:
                    matched_row = name_to_row[alias.lower()]
                    break

        # 2. Board matching
        if not matched_row:
            if tag_clean in board_to_row:
                matched_row = board_to_row[tag_clean]

        # 3. Exact company name matching
        if not matched_row:
            if tag_clean in name_to_row:
                matched_row = name_to_row[tag_clean]

        # 4. Search in file company names
        if not matched_row:
            for fc in company_names:
                fc_clean = fc.lower().replace(" ", "").replace("-", "").replace("'", "")
                if tag_clean == fc_clean or tag_clean in fc_clean or fc_clean in tag_clean:
                    if fc.lower() in name_to_row:
                        matched_row = name_to_row[fc.lower()]
                        break

        # 5. Search in all DB company names
        if not matched_row:
            for r in db_rows:
                cname = r[0].lower().replace(" ", "").replace("-", "").replace("'", "")
                if tag_clean == cname or tag_clean in cname:
                    matched_row = r
                    break

        if matched_row:
            target_company = matched_row[0]
            cur.execute(
                """
                UPDATE company_ats
                SET workday_url = %s,
                    ats = CASE WHEN LOWER(ats) != 'workday' THEN 'Workday' ELSE ats END
                WHERE company = %s;
                """,
                (base_api_url, target_company)
            )
            updated_count += 1
            print(f"[{idx:2d}/{len(urls)}] Updated DB: '{target_company:30}' -> {base_api_url}")
        else:
            fallback_name = company_tag.capitalize()
            for fc in company_names:
                if company_tag.lower() in fc.lower():
                    fallback_name = fc
                    break

            cur.execute(
                """
                INSERT INTO company_ats (company, ats, board, workday_url)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (company) DO UPDATE SET
                    workday_url = EXCLUDED.workday_url,
                    ats = EXCLUDED.ats;
                """,
                (fallback_name, "Workday", company_tag, base_api_url)
            )
            inserted_count += 1
            print(f"[{idx:2d}/{len(urls)}] Inserted DB: '{fallback_name:30}' -> {base_api_url}")

    cur.close()
    conn.close()

    print(f"\nCompleted! Total Updated: {updated_count}, Total Inserted: {inserted_count}")


if __name__ == "__main__":
    process_workday_urls()
