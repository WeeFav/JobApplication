import os
import sys
import time
import pandas as pd
import psycopg2
import requests
from dotenv import load_dotenv

# Ensure BASE_DIR is in path so company_ats_linkedin can be imported
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

from company_ats_linkedin import convert_workday_url

# Load environment variables from .env file
load_dotenv(os.path.join(BASE_DIR, ".env"))

DEFAULT_CSV_PATH = r"D:\JobApplication\python_app\companies.csv"


def get_db_connection():
    """Establishes connection to PostgreSQL database with localhost fallback."""
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
            port=port
        )
    except psycopg2.OperationalError:
        if db_host != "localhost":
            print(f"Failed to connect to DB host '{db_host}'. Trying fallback to 'localhost'...")
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


def fetch_workday_url_from_serpapi(company_name: str, api_key: str):
    """
    Searches SerpAPI for site:myworkdayjobs.com "<company_name>",
    extracts the first organic result URL, and returns the converted workday_url.
    """
    if not api_key:
        print(f"  [Warning] SERPAPI_API_KEY/SERPAPI_KEY is missing. Skipping SerpAPI lookup for '{company_name}'.")
        return None

    search_url = "https://serpapi.com/search.json"
    params = {
        "engine": "google",
        "q": f'site:myworkdayjobs.com "{company_name}"',
        "api_key": api_key
    }

    try:
        response = requests.get(search_url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        organic_results = data.get("organic_results", [])
        if organic_results and len(organic_results) > 0:
            first_url = organic_results[0].get("link")
            if first_url:
                print(f"  [SerpAPI] Found result URL: {first_url}")
                _, base_api_url = convert_workday_url(first_url)
                return base_api_url
        print(f"  [SerpAPI] No organic results found for '{company_name}'.")
    except Exception as e:
        print(f"  [SerpAPI Error] Search failed for '{company_name}': {e}")

    return None


def process_companies(csv_path: str = None, skip_existing: bool = True):
    """
    Reads companies.csv, extracts name, slug, and ats_system columns,
    queries SerpAPI for Workday ATS companies to extract workday_url,
    and inserts records into company_ats table.
    """
    if not csv_path or not os.path.exists(csv_path):
        if os.path.exists(DEFAULT_CSV_PATH):
            csv_path = DEFAULT_CSV_PATH
        else:
            fallback_csv = os.path.join(BASE_DIR, "companies.csv")
            if os.path.exists(fallback_csv):
                csv_path = fallback_csv
            else:
                raise FileNotFoundError(f"Companies CSV file not found at '{csv_path}' or '{DEFAULT_CSV_PATH}'")

    print(f"Reading CSV from: {csv_path}")
    df = pd.read_csv(csv_path)

    # Validate required columns
    required_cols = {"name", "slug", "ats_system"}
    if not required_cols.issubset(set(df.columns)):
        raise ValueError(f"CSV is missing required columns. Expected {required_cols}, found {list(df.columns)}")

    serpapi_key = os.getenv("SERPAPI_API_KEY") or os.getenv("SERPAPI_KEY")
    if not serpapi_key:
        print("Notice: Neither SERPAPI_API_KEY nor SERPAPI_KEY found in environment variables.")

    conn = get_db_connection()
    cursor = conn.cursor()

    existing_companies = set()
    if skip_existing:
        try:
            cursor.execute("SELECT company FROM company_ats")
            existing_companies = {row[0] for row in cursor.fetchall()}
            print(f"Loaded {len(existing_companies)} existing companies from DB.")
        except Exception as e:
            print(f"Could not load existing companies from DB: {e}")

    inserted_count = 0
    updated_count = 0

    for idx, row in df.iterrows():
        company_name = str(row["name"]).strip() if pd.notna(row["name"]) else ""
        slug = str(row["slug"]).strip() if pd.notna(row["slug"]) else ""
        ats_system = str(row["ats_system"]).strip() if pd.notna(row["ats_system"]) else ""

        if not company_name:
            continue

        comp_val = company_name[:150]
        ats_val = ats_system[:150]
        board_val = slug[:150]

        if skip_existing and comp_val in existing_companies:
            print(f"[{idx+1}/{len(df)}] Skipping existing company: {comp_val}")
            continue

        workday_url = None
        if ats_system.lower() == "workday":
            print(f"[{idx+1}/{len(df)}] Processing Workday ATS company: '{comp_val}'...")
            workday_url = fetch_workday_url_from_serpapi(comp_val, serpapi_key)
            time.sleep(0.2)
        else:
            print(f"[{idx+1}/{len(df)}] Processing company: '{comp_val}' (ATS: {ats_val})")

        sql = """
            INSERT INTO company_ats (company, ats, board, workday_url)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (company) DO UPDATE SET
                ats = EXCLUDED.ats,
                board = EXCLUDED.board,
                workday_url = EXCLUDED.workday_url;
        """

        try:
            cursor.execute(sql, (comp_val, ats_val, board_val, workday_url))
            if comp_val in existing_companies:
                updated_count += 1
            else:
                inserted_count += 1
                existing_companies.add(comp_val)
            print(f"  -> Saved to DB: {comp_val} | ATS: {ats_val} | Board: {board_val} | Workday URL: {workday_url}")
        except Exception as db_err:
            print(f"  -> Database insertion error for '{comp_val}': {db_err}")

    cursor.close()
    conn.close()
    print(f"\nCompleted! Total Inserted: {inserted_count}, Total Updated: {updated_count}")


if __name__ == "__main__":
    process_companies()
