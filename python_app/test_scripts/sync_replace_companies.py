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

def sync_company_ats():
    candidate_paths = [
        os.path.join(BASE_DIR, "replace.csv"),
        os.path.join(PROJECT_ROOT, "replace.csv"),
        "/home/amd123/Desktop/JobApplication/replace.csv",
        "/app/replace.csv",
        "replace.csv"
    ]
    csv_path = None
    for p in candidate_paths:
        if os.path.exists(p):
            csv_path = p
            break
        
    if not csv_path:
        print(f"Error: Could not find replace.csv in candidate paths: {candidate_paths}")
        return

    print(f"Reading {csv_path}...")
    df = pd.read_csv(csv_path)
    
    # Clean up columns and string values
    df.columns = [col.strip().lower() for col in df.columns]
    
    records = []
    csv_companies = set()
    
    for _, row in df.iterrows():
        company = str(row.get('company', '')).strip()
        if not company or company.lower() == 'nan':
            continue
        
        ats = str(row.get('ats', '')).strip() if pd.notna(row.get('ats')) else None
        if ats and ats.upper() == 'NULL':
            ats = None
            
        board = str(row.get('board', '')).strip() if pd.notna(row.get('board')) else None
        if board and board.upper() == 'NULL':
            board = None
            
        workday_url = str(row.get('workday_url', '')).strip() if pd.notna(row.get('workday_url')) else None
        if workday_url and workday_url.upper() == 'NULL':
            workday_url = None
            
        records.append((company, ats, board, workday_url))
        csv_companies.add(company)

    print(f"Found {len(records)} valid companies in {csv_path}.")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Delete all companies in company_ats that are NOT in replace.csv
        cursor.execute("SELECT COUNT(*) FROM company_ats;")
        initial_count = cursor.fetchone()[0]

        cursor.execute("SELECT company FROM company_ats;")
        db_companies = {row[0] for row in cursor.fetchall()}
        
        to_delete = db_companies - csv_companies
        
        if to_delete:
            cursor.execute(
                "DELETE FROM company_ats WHERE company NOT IN %s;",
                (tuple(csv_companies),)
            )
            deleted_count = cursor.rowcount
            print(f"Deleted {deleted_count} companies from company_ats that were not in replace.csv.")
        else:
            deleted_count = 0
            print("No extra companies to delete.")

        # 2. Upsert companies from replace.csv
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
        print(f"Deleted rows:     {deleted_count}")
        print(f"Upserted rows:    {len(records)}")
        print(f"Final DB count:   {final_count}")

    except Exception as e:
        conn.rollback()
        print(f"Error updating company_ats: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    sync_company_ats()
