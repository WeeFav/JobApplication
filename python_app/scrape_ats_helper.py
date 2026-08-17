import os
import re
import psycopg2
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))


def get_db_connection():
    db_host = os.environ.get("POSTGRES_HOST", "postgres")
    try:
        return psycopg2.connect(
            host=db_host,
            user=os.environ.get("POSTGRES_USER"),
            password=os.environ.get("POSTGRES_PASSWORD"),
            database=os.environ.get("POSTGRES_DB"),
            port=os.environ.get("POSTGRES_PORT")
        )
    except psycopg2.OperationalError:
        if db_host != "localhost":
            return psycopg2.connect(
                host="localhost",
                user=os.environ.get("POSTGRES_USER"),
                password=os.environ.get("POSTGRES_PASSWORD"),
                database=os.environ.get("POSTGRES_DB"),
                port=os.environ.get("POSTGRES_PORT")
            )
        raise


def get_company_by_board(ats, board):
    """Finds company name (or company, workday_url for Workday) for a given ATS and board from company_ats table."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        if ats.lower() == 'workday':
            cursor.execute(
                "SELECT company, workday_url FROM company_ats WHERE LOWER(ats) = 'workday' AND LOWER(board) = LOWER(%s)",
                (board,)
            )
            row = cursor.fetchone()
            cursor.close()
            conn.close()
            if row:
                return row[0], row[1]
            return None, None
        else:
            cursor.execute(
                "SELECT company FROM company_ats WHERE LOWER(ats) = LOWER(%s) AND LOWER(board) = LOWER(%s)",
                (ats, board)
            )
            row = cursor.fetchone()
            cursor.close()
            conn.close()
            if row:
                return row[0]
    except Exception as e:
        print(f"DB query error: {e}")
    return (None, None) if ats.lower() == 'workday' else None


def get_board_by_company(ats, company):
    """Finds board (or board, workday_url for Workday) for a given ATS and company from company_ats table."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        if ats.lower() == 'workday':
            cursor.execute(
                "SELECT board, workday_url FROM company_ats WHERE LOWER(ats) = 'workday' AND (company = %s OR LOWER(company) = LOWER(%s))",
                (company, company)
            )
            row = cursor.fetchone()
            cursor.close()
            conn.close()
            if row:
                return row[0], row[1]
            return None, None
        else:
            cursor.execute(
                "SELECT board FROM company_ats WHERE LOWER(ats) = LOWER(%s) AND (company = %s OR LOWER(company) = LOWER(%s))",
                (ats, company, company)
            )
            row = cursor.fetchone()
            cursor.close()
            conn.close()
            if row and row[0]:
                return row[0]
    except Exception as e:
        print(f"DB query error: {e}")
    return (None, None) if ats.lower() == 'workday' else None


US_STATES_ABBR = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", 
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", 
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", 
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", 
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
]

US_STATES_FULL = [
    "alabama", "alaska", "arizona", "arkansas", "california", "colorado", 
    "connecticut", "delaware", "florida", "georgia", "hawaii", "idaho", 
    "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana", 
    "maine", "maryland", "massachusetts", "michigan", "minnesota", 
    "mississippi", "missouri", "montana", "nebraska", "nevada", 
    "new hampshire", "new jersey", "new mexico", "new york", 
    "north carolina", "north dakota", "ohio", "oklahoma", "oregon", 
    "pennsylvania", "rhode island", "south carolina", "south dakota", 
    "tennessee", "texas", "utah", "vermont", "virginia", "washington", 
    "west virginia", "wisconsin", "wyoming", "district of columbia"
]

US_COUNTRY_PATTERN = re.compile(r'\b(usa|u\.s\.a\.|u\.s\.|united states|united states of america)\b', re.IGNORECASE)
US_STATE_ABBR_PATTERN = re.compile(r'\b(' + '|'.join(US_STATES_ABBR) + r')\b', re.IGNORECASE)
US_STATE_FULL_PATTERN = re.compile(r'\b(' + '|'.join(US_STATES_FULL) + r')\b', re.IGNORECASE)


def is_usa_location(location_name):
    """Checks if a location string represents a location in the United States."""
    if not location_name:
        return False
    loc = str(location_name).strip()
    
    if US_COUNTRY_PATTERN.search(loc):
        return True

    if re.search(r'\bUS\b', loc):
        return True

    if US_STATE_ABBR_PATTERN.search(loc):
        return True

    if US_STATE_FULL_PATTERN.search(loc):
        return True

    return False


def is_intern_title(title):
    """Checks if a job title refers to an internship role."""
    if not title:
        return False
    title_lower = str(title).lower()
    return "intern" in title_lower and "internal" not in title_lower and "international" not in title_lower


def is_valid_job(title, location_name):
    """Filters jobs to only include US-based internship positions."""
    return is_intern_title(title) and is_usa_location(location_name)
