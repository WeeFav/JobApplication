import os
import sys
import pandas as pd
import psycopg2
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
load_dotenv(os.path.join(BASE_DIR, ".env"))

def get_db_connection():
    db_host = os.environ.get("POSTGRES_HOST", "postgres")
    try:
        return psycopg2.connect(
            host=db_host,
            user=os.environ.get("POSTGRES_USER", "root"),
            password=os.environ.get("POSTGRES_PASSWORD", "root"),
            database=os.environ.get("POSTGRES_DB", "jobapplication"),
            port=os.environ.get("POSTGRES_PORT", "5432")
        )
    except psycopg2.OperationalError:
        if db_host != "localhost":
            return psycopg2.connect(
                host="localhost",
                user=os.environ.get("POSTGRES_USER", "root"),
                password=os.environ.get("POSTGRES_PASSWORD", "root"),
                database=os.environ.get("POSTGRES_DB", "jobapplication"),
                port=os.environ.get("POSTGRES_PORT", "5432")
            )
        raise

def add_companies():
    candidate_paths = [
        os.path.join(BASE_DIR, "add.csv"),
        os.path.join(PROJECT_ROOT, "add.csv"),
        "/home/amd123/Desktop/JobApplication/add.csv",
        "/app/add.csv",
        "add.csv"
    ]
    csv_path = None
    for p in candidate_paths:
        if os.path.exists(p):
            csv_path = p
            break

    if not csv_path:
        print(f"Error: Could not find add.csv in candidate paths: {candidate_paths}")
        return

    print(f"Reading {csv_path}...")
    df = pd.read_csv(csv_path)
    df.columns = [col.strip().lower() for col in df.columns]

    records = []
    for _, row in df.iterrows():
        company = str(row.get('company', '')).strip()
        if not company or company.lower() == 'nan':
            continue

        ats = str(row.get('ats', '')).strip() if pd.notna(row.get('ats')) else None
        if ats and ats.lower() in ('null', 'none', 'nan', ''):
            ats = None

        board = str(row.get('board', '')).strip() if pd.notna(row.get('board')) else None
        if board and board.lower() in ('null', 'none', 'nan', ''):
            board = None

        workday_url = str(row.get('workday_url', '')).strip() if pd.notna(row.get('workday_url')) else None
        if workday_url and workday_url.lower() in ('null', 'none', 'nan', ''):
            workday_url = None

        records.append((company, ats, board, workday_url))

    print(f"Found {len(records)} companies to add/update from {csv_path}.")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT COUNT(*) FROM company_ats;")
        initial_count = cursor.fetchone()[0]

        upsert_query = """
            INSERT INTO company_ats (company, ats, board, workday_url)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (company) DO UPDATE SET
                ats = EXCLUDED.ats,
                board = EXCLUDED.board,
                workday_url = EXCLUDED.workday_url;
        """
        cursor.executemany(upsert_query, records)
        conn.commit()

        cursor.execute("SELECT COUNT(*) FROM company_ats;")
        final_count = cursor.fetchone()[0]

        print("\n--- Summary ---")
        print(f"Initial DB count: {initial_count}")
        print(f"Processed rows:   {len(records)}")
        print(f"Final DB count:   {final_count}")

    except Exception as e:
        conn.rollback()
        print(f"Error adding companies to company_ats: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    add_companies()
