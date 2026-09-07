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


INTERN_PATTERN = re.compile(r'\b(intern|interns|internship|co-op|coop)\b', re.IGNORECASE)

TECH_PATTERNS = [
    # Software & Development
    r'\b(software|swe|sde|sdet|mts)\b',
    r'\b(developer|programmer|programming|coding|coder)\b',
    r'\b(full[\s-]?stack|back[\s-]?end|front[\s-]?end|web[\s-]?dev\w*|mobile[\s-]?dev\w*)\b',
    r'\b(ios|android|application[s]?[\s-]?engineer\w*|app[\s-]?developer\w*)\b',
    r'\b(devops|devsecops|sre|site[\s-]?reliability|platform[\s-]?engineer\w*|cloud[\s-]?engineer\w*|infrastructure|infra)\b',
    r'\b(systems?[\s-]?engineer\w*|systems?[\s-]?software|system[\s-]?admin\w*|sysadmin)\b',
    r'\b(embedded|firmware|kernel|operating[\s-]?systems?|rtos|linux|unix)\b',
    r'\b(compiler[s]?|llvm)\b',
    r'\b(cybersecurity|cyber[\s-]?security|infosec|appsec|netsec|information[\s-]?security|penetration[\s-]?test\w*|cryptograph\w*|crypto|blockchain|smart[\s-]?contract\w*|web3)\b',
    r'\b(qa\b|quality[\s-]?assurance|test[\s-]?engineer\w*|test[\s-]?automation|automation[\s-]?engineer\w*|software[\s-]?test\w*)\b',
    r'\b(network[\s-]?engineer\w*|networking|telecom\w*)\b',
    r'\b(distributed[\s-]?systems?|database[s]?|dba|nosql|sql)\b',
    r'\b(game[\s-]?dev\w*|graphics?[\s-]?programm\w*|rendering[\s-]?engineer\w*|unity|unreal)\b',
    
    # AI / Machine Learning / Vision / NLP
    r'\b(ai|artificial[\s-]?intelligence)\b',
    r'\b(ml|machine[\s-]?learning)\b',
    r'\b(deep[\s-]?learning|dl)\b',
    r'\b(nlp|nlu|natural[\s-]?language|llm[s]?|large[\s-]?language|genai|generative[\s-]?ai)\b',
    r'\b(computer[\s-]?vision|cv\b|image[\s-]?processing)\b',
    r'\b(neural|neural[\s-]?networks?)\b',
    r'\b(reinforcement[\s-]?learning|rl\b)\b',
    r'\b(speech[\s-]?recognition|audio[\s-]?processing|perception)\b',
    r'\b(mlops|applied[\s-]?scien\w*|research[\s-]?scien\w*|research[\s-]?engineer\w*)\b',

    # Data & Analytics
    r'\b(data[\s-]?scien\w*|data[\s-]?engineer\w*|data[\s-]?anal\w*|data[\s-]?platform|data[\s-]?pipeline|data[\s-]?warehouse\w*|data[\s-]?mining|data[\s-]?model\w*|big[\s-]?data)\b',
    r'\b(business[\s-]?intelligence|bi[\s-]?developer\w*|bi[\s-]?analyst\w*|bi[\s-]?engineer\w*|\bbi\b)\b',
    r'\b(analytics?[\s-]?engineer\w*|statistician|statistics?|statistical|decision[\s-]?science|etl)\b',
    r'\b(data|bioinformatics|computational[\s-]?bio\w*|cheminformatics|chemoinformatics|geospatial|gis)\b',

    # Quant & Financial Engineering
    r'\b(quant|quantitative)\b',
    r'\b(algo[\s-]?trading|algorithmic[\s-]?trading|automated[\s-]?trading|hft|high[\s-]?frequency[\s-]?trading)\b',
    r'\b(financial[\s-]?engineering|computational[\s-]?finance|fintech)\b',
    r'\b(quant[\s-]?strat\w*|strats?)\b',

    # Hardware & Electrical & Semiconductors
    r'\b(hardware|hw\b)\b',
    r'\b(electrical|electronics?|ee\b)\b',
    r'\b(semiconductor[s]?|silicon|microelectronics?)\b',
    r'\b(asic|fpga|rtl|vlsi|soc|chip[\s-]?design\w*|chip[s]?|pcb|circuit[s]?|circuit[\s-]?design\w*)\b',
    r'\b(digital[\s-]?design\w*|analog[\s-]?design\w*|analog|rf\b|radio[\s-]?frequency|antenna)\b',
    r'\b(microcontroller|mcu|dsp|signal[\s-]?processing)\b',
    r'\b(physical[\s-]?design\w*|dft|design[\s-]?for[\s-]?test)\b',
    r'\b(optics|optical|photonics|lasers?|sensors?|sensing)\b',
    r'\b(silicon[\s-]?validation|hardware[\s-]?validation|post[\s-]?silicon|cad\b|thermal[\s-]?engineer\w*|optomechanical)\b',

    # Robotics & Autonomy & Controls
    r'\b(robotics?|robotic|robots?)\b',
    r'\b(autonomous|autonomy|self[\s-]?driving|ad[\s-]?\/[\s-]?adas|adas)\b',
    r'\b(controls?|control[\s-]?systems?|controls?[\s-]?engineer\w*|guidance[\s-]?navigation|gnc)\b',
    r'\b(slam|motion[\s-]?planning|localization|path[\s-]?planning|trajectory)\b',
    r'\b(mechatronics?)\b',
    r'\b(drone[s]?|uav|agv|ros|ros2|actuators?|actuation|kinematics|dynamics)\b',

    # Technology & General STEM Engineering
    r'\b(tech|technology|technologist|technical)\b',
    r'\b(computer[\s-]?science|cs\b|computing|computational)\b',
    r'\b(information[\s-]?technology|infotech|\bit\b)\b',
    r'\b(engineer[s]?|engineering)\b',
    r'\b(r&d|research[\s-]?&[\s-]?development|research[\s-]?and[\s-]?development)\b',
    r'\b(algorithms?|simulation|modelling|modeling)\b',
    r'\b(solutions?[\s-]?architect|technical[\s-]?solutions?|tpm\b|technical[\s-]?program|technical[\s-]?product)\b',
]

STRONG_TECH_ROLE_PATTERNS = [
    r'\b(software[\s-]?engineer\w*|software[\s-]?dev\w*|swe\b|sde\b|sdet\b|mts\b)\b',
    r'\b(developer|programmer)\b',
    r'\b(full[\s-]?stack|back[\s-]?end|front[\s-]?end)\b',
    r'\b(data[\s-]?scientist\w*|data[\s-]?science|data[\s-]?engineer\w*|data[\s-]?analyst\w*|data[\s-]?analytics|data)\b',
    r'\b(machine[\s-]?learning|deep[\s-]?learning|artificial[\s-]?intelligence|\bai\b|\bml\b|\bdl\b|\bnlp\b|\bllm[s]?\b|computer[\s-]?vision)\b',
    r'\b(quant|quantitative|algo[\s-]?trading|financial[\s-]?engineering)\b',
    r'\b(hardware[\s-]?engineer\w*|electrical[\s-]?engineer\w*|electronics?[\s-]?engineer\w*|asic|fpga|rtl|vlsi|silicon)\b',
    r'\b(robotics?|autonomous|control[\s-]?systems?|controls?[\s-]?engineer\w*|mechatronics?)\b',
    r'\b(firmware|embedded|devops|sre|cybersecurity|cloud[\s-]?engineer\w*|systems?[\s-]?engineer\w*)\b',
    r'\b(research[\s-]?scientist|research[\s-]?engineer|applied[\s-]?scientist)\b',
]

EXCLUDE_ROLE_INTERN_PATTERNS = [
    r'\b(marketing|market[\s-]?research|sales|inside[\s-]?sales|business[\s-]?development|\bbdr\b|\bsdr\b|accounting|accountant|audit\w*|tax\w*|payroll|pharmacy|pharmacist|pharmaceutical|pharm[\s-]?d|nurse|nursing|medical|clinic\w*|human[\s-]?resources|\bhr\b|recruiting|recruiter|talent[\s-]?acquisition|people[\s-]?ops|legal|paralegal|compliance|supply[\s-]?chain|logistics|procurement|public[\s-]?relations|\bpr\b|social[\s-]?media|real[\s-]?estate|culinary|receptionist|graphic[\s-]?design\w*)\s+(intern|internship|co-op|coop)\b',
]

EXCLUDE_LEADING_INTERN_PATTERNS = [
    r'^(?:(?:\d{4}|summer|fall|spring|winter|graduate|undergraduate|student|global|corporate|us|usa)\s+)*(?:intern|internship|co-op|coop)\s*[-–—:,/]\s*(marketing|market[\s-]?research|sales|inside[\s-]?sales|business[\s-]?development|\bbdr\b|\bsdr\b|accounting|accountant|tax\w*|audit\w*|payroll|pharmacy|pharmacist|pharmaceutical|nursing|nurse|medical|clinical|human[\s-]?resources|\bhr\b|recruiting|recruiter|talent[\s-]?acquisition|people[\s-]?operations|people[\s-]?ops|legal|paralegal|compliance|supply[\s-]?chain|logistics|procurement|purchasing|public[\s-]?relations|\bpr\b|social[\s-]?media|real[\s-]?estate|culinary|receptionist|graphic[\s-]?design\w*)\b',
]

EXCLUDE_PATTERNS = [
    # Marketing / PR / Social Media / Content / Communications
    r'\b(marketing|market[\s-]?research|social[\s-]?media|public[\s-]?relations|\bpr\b|brand|branding|communications?|corporate[\s-]?communications?|content[\s-]?creat\w*|content[\s-]?marketing|copywrit\w*|creative[\s-]?director|advertising|media[\s-]?planner|events?|event[\s-]?planning)\b',
    
    # Sales / Business Development / Retail / Merchandising
    r'\b(sales|inside[\s-]?sales|business[\s-]?development|\bbdr\b|\bsdr\b|account[\s-]?exec\w*|account[\s-]?manag\w*|customer[\s-]?success|client[\s-]?success|client[\s-]?services|merchandis\w*|retail|store[\s-]?associate|commercial[\s-]?ops)\b',
    
    # Accounting / Tax / Audit / Banking / Insurance (non-quant)
    r'\b(accounting|accountant|audit\w*|tax\w*|payroll|bookkeep\w*|accounts?[\s-]?payable|accounts?[\s-]?receivable|underwrit\w*|wealth[\s-]?management|financial[\s-]?advisor\w*|loan[\s-]?officer|mortgage|teller|branch[\s-]?banker|actuar\w*)\b',
    
    # Healthcare / Pharmacy / Clinical / Nursing / Medical
    r'\b(pharmacy|pharmacist|pharmaceutical|pharm[\s-]?d|nurse|nursing|medical|physician|clinic\w*|patient[\s-]?care|dental|dentist\w*|therap\w*|veterinar\w*|optometr\w*|phlebotom\w*|radiology|surgical|hospital)\b',
    
    # Human Resources / Recruiting / Talent
    r'\b(human[\s-]?resources|\bhr\b|recruiting|recruiter|talent[\s-]?acquisition|people[\s-]?operations|people[\s-]?ops|employee[\s-]?relations|onboarding|benefits|compensation)\b',
    
    # Legal / Compliance / Government / Policy
    r'\b(legal|attorney|counsel|lawyer|paralegal|law[\s-]?clerk|compliance|regulatory[\s-]?affairs|government[\s-]?affairs|public[\s-]?policy|policy)\b',
    
    # Supply Chain / Logistics / Procurement / Warehouse
    r'\b(supply[\s-]?chain|logistics|procurement|purchasing|buyer|sourcing|warehouse|warehousing|fulfillment|freight|inventory)\b',
    
    # Real Estate / Property / Facilities / Culinary / Hospitality / Admin
    r'\b(real[\s-]?estate|realtor|property[\s-]?manag\w*|leasing|culinary|chef|pastry|cook|food[\s-]?service|hospitality|hotel|catering|housekeeping|janitorial|receptionist|administrative[\s-]?assistant|office[\s-]?assistant|executive[\s-]?assistant|customer[\s-]?service|customer[\s-]?support)\b',
    
    # Pure Art / Fashion / Design (non-tech)
    r'\b(fashion|apparel|interior[\s-]?design|graphic[\s-]?design\w*)\b',
]

TECH_REGEX = re.compile('|'.join(TECH_PATTERNS), re.IGNORECASE)
STRONG_TECH_REGEX = re.compile('|'.join(STRONG_TECH_ROLE_PATTERNS), re.IGNORECASE)
EXCLUDE_ROLE_INTERN_REGEX = re.compile('|'.join(EXCLUDE_ROLE_INTERN_PATTERNS), re.IGNORECASE)
EXCLUDE_LEADING_INTERN_REGEX = re.compile('|'.join(EXCLUDE_LEADING_INTERN_PATTERNS), re.IGNORECASE)
EXCLUDE_REGEX = re.compile('|'.join(EXCLUDE_PATTERNS), re.IGNORECASE)


def is_intern_title(title):
    """Checks if a job title refers to an internship or co-op role."""
    if not title:
        return False
    return bool(INTERN_PATTERN.search(str(title)))


def is_tech_title(title):
    """Checks if a job title refers to a software, AI, data, quant, hardware, robotics, or technology role."""
    if not title:
        return False
    title_str = str(title).strip()
    
    # 1. Primary non-tech role check (e.g. "Marketing Intern", "Sales Intern", "Tax Intern")
    if EXCLUDE_ROLE_INTERN_REGEX.search(title_str):
        return False

    # 2. Leading intern prefix with non-tech discipline (e.g. "Intern - Marketing", "Summer 2026 Intern - Sales")
    if EXCLUDE_LEADING_INTERN_REGEX.search(title_str):
        return False

    # 3. Must match at least one tech pattern
    if not TECH_REGEX.search(title_str):
        return False
        
    # 4. If it contains non-tech keywords (e.g., 'marketing', 'sales', 'pharmacy'),
    # only keep if it has an explicit strong tech role identifier (e.g. "Software Engineer Intern - Marketing Tech")
    if EXCLUDE_REGEX.search(title_str):
        if not STRONG_TECH_REGEX.search(title_str):
            return False

    return True


def is_valid_job(title, location_name):
    """Filters jobs to only include US-based software/AI/data/quant/hardware/robotics/tech internship positions."""
    return is_intern_title(title) and is_tech_title(title) and is_usa_location(location_name)
