import os
import sys
import re
import argparse
from urllib.parse import urlparse
from check_company_ats import get_db_connection

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(BASE_DIR, "log.txt")


def parse_workday_url(web_url: str):
    """
    Parses a Workday web URL and returns (board_name, api_url).
    Example input: 'https://amcn.wd5.myworkdayjobs.com/amcnetworks'
    Output: ('amcn', 'https://amcn.wd5.myworkdayjobs.com/wday/cxs/amcn/amcnetworks')
    """
    web_url = web_url.strip()
    parsed = urlparse(web_url)
    netloc = parsed.netloc.lower()
    path = parsed.path.strip("/")

    # Board name is the first subdomain before .wd*.myworkdayjobs.com
    subdomains = netloc.split(".")
    board_name = subdomains[0]

    api_url = f"https://{netloc}/wday/cxs/{board_name}/{path}"
    return board_name, api_url


def read_log_text(log_path: str) -> str:
    """Reads log file with encoding fallback."""
    if not os.path.exists(log_path):
        raise FileNotFoundError(f"Log file not found at: {log_path}")

    text = None
    for enc in ["utf-16", "utf-16le", "utf-8", "latin-1"]:
        try:
            with open(log_path, "r", encoding=enc) as f:
                text = f.read()
            if text and ("Company" in text or "fix" in text or "ATS" in text):
                break
        except Exception:
            continue

    if text is None:
        raise ValueError(f"Unable to read content from {log_path}")

    return text


def read_log_blocks(log_path: str):
    """Splits log file text into blocks."""
    text = read_log_text(log_path)
    blocks = text.split("------------------------------------------------------------")
    return blocks


def extract_all_companies_from_log(log_path: str):
    """
    Extracts set of company names (and board names) present in the log file.
    Returns (set of company_names_lower, set of board_names_lower).
    """
    text = read_log_text(log_path)
    comp_names = set()
    board_names = set()

    for line in text.splitlines():
        line_str = line.strip()
        if not line_str:
            continue

        # Header pattern: [14/414] Company: 'Niantic Spatial' | ATS: Ashby | Board: 'niantic'
        if "Company:" in line_str:
            m_comp = re.search(r"Company:\s*'([^']*)'", line_str)
            if m_comp and m_comp.group(1).strip():
                comp_names.add(m_comp.group(1).strip().lower())

            m_board = re.search(r"Board:\s*'([^']*)'", line_str)
            if m_board and m_board.group(1).strip():
                board_names.add(m_board.group(1).strip().lower())

        # Fallback log line pattern: Company 'Banner Health': ...
        if "Company '" in line_str:
            m_comp_fallback = re.search(r"Company\s*'([^']+)':", line_str)
            if m_comp_fallback and m_comp_fallback.group(1).strip():
                comp_names.add(m_comp_fallback.group(1).strip().lower())

    return comp_names, board_names


def parse_block(block_text: str):
    """
    Parses a single log block and returns fix instructions if present.
    Returns dict with company, board, and actions to take, or None if no fix/internal line.
    """
    lines = [l.strip() for l in block_text.strip().splitlines() if l.strip()]
    if not lines:
        return None

    last_line = lines[-1]
    if not (last_line.startswith("fix") or last_line.startswith("internal")):
        return None

    comp_name = None
    board_name = None
    ats_name = None

    for line in lines:
        if "Company:" in line:
            m_comp = re.search(r"Company:\s*'([^']*)'", line)
            if m_comp:
                comp_name = m_comp.group(1).strip()

            m_ats = re.search(r"ATS:\s*([^\|]+)", line)
            if m_ats:
                ats_name = m_ats.group(1).strip()

            m_board = re.search(r"Board:\s*'([^']*)'", line)
            if m_board:
                board_name = m_board.group(1).strip()
            break

    # If comp_name is empty/whitespace, check for "Company 'X':" in log message lines
    if not comp_name:
        for line in lines:
            m_comp_fallback = re.search(r"Company\s*'([^']+)':", line)
            if m_comp_fallback:
                comp_name = m_comp_fallback.group(1).strip()
                break

    action = {"company": comp_name, "board": board_name, "ats": ats_name, "raw_last_line": last_line}

    if last_line.startswith("internal"):
        action["type"] = "internal"
        action["updates"] = {"ats": "Internal ATS", "workday_url": None}
    elif last_line.startswith("fix"):
        action["type"] = "fix"
        fix_content = last_line[3:].strip()
        updates = {}

        if fix_content.startswith("url="):
            raw_url = fix_content[4:].strip()
            w_board, w_api_url = parse_workday_url(raw_url)
            updates["ats"] = "Workday"
            updates["board"] = w_board
            updates["workday_url"] = w_api_url
        else:
            parts = [p.strip() for p in fix_content.split(",") if p.strip()]
            for part in parts:
                if "=" in part:
                    k, v = part.split("=", 1)
                    k = k.strip().lower()
                    v = v.strip()
                    if k == "ats":
                        ats_lower = v.lower()
                        if ats_lower == "ashby":
                            v = "Ashby"
                        elif ats_lower == "greenhouse":
                            v = "Greenhouse"
                        elif ats_lower == "lever":
                            v = "Lever"
                        elif ats_lower == "workday":
                            v = "Workday"
                        updates["ats"] = v
                    elif k == "board":
                        updates["board"] = v
                    elif k in ["url", "workday_url"]:
                        updates["workday_url"] = v

        action["updates"] = updates

    return action


def update_company_ats_table(actions, dry_run: bool = False):
    """Executes database updates for all parsed actions."""
    if not actions:
        print("No fix/internal instructions to update.")
        return

    conn = get_db_connection()
    cur = conn.cursor()

    updated_count = 0
    skipped_count = 0

    print(f"\nProcessing {len(actions)} entries from log file (dry_run={dry_run})...\n" + "=" * 70)

    for idx, act in enumerate(actions, start=1):
        comp = act["company"]
        board = act["board"]
        updates = act["updates"]
        raw = act["raw_last_line"]

        # Find row in DB by company or by board fallback
        db_row = None
        match_col = None
        match_val = None

        if comp:
            cur.execute("SELECT company, ats, board, workday_url FROM company_ats WHERE company = %s;", (comp,))
            rows = cur.fetchall()
            if rows:
                db_row = rows[0]
                match_col = "company"
                match_val = comp

        if not db_row and board:
            cur.execute("SELECT company, ats, board, workday_url FROM company_ats WHERE board = %s;", (board,))
            rows = cur.fetchall()
            if rows:
                db_row = rows[0]
                match_col = "board"
                match_val = board

        if not db_row:
            print(f"[{idx}/{len(actions)}] WARNING: No DB record found for Company '{comp}' / Board '{board}'. Skipping.")
            skipped_count += 1
            continue

        real_company_name = db_row[0]

        # Construct SQL UPDATE statement dynamically
        set_clauses = []
        params = []
        for k, v in updates.items():
            if v is None:
                set_clauses.append(f"{k} = NULL")
            else:
                set_clauses.append(f"{k} = %s")
                params.append(v)

        params.append(real_company_name)
        sql = f"UPDATE company_ats SET {', '.join(set_clauses)} WHERE company = %s;"

        print(f"[{idx}/{len(actions)}] Target: '{real_company_name}'")
        print(f"  Fix Line: {raw}")
        print(f"  Old DB State: ATS={db_row[1]}, Board='{db_row[2]}', Workday_URL='{db_row[3]}'")
        print(f"  New Updates : {updates}")

        if not dry_run:
            cur.execute(sql, tuple(params))
            print(f"  -> Successfully updated in DB.")
        else:
            print(f"  -> [DRY RUN] SQL: {sql} | Params: {params}")

        print("-" * 70)
        updated_count += 1

    cur.close()
    conn.close()

    print("\n" + "=" * 70)
    print("UPDATE SUMMARY:")
    print(f"Total Log Actions Found: {len(actions)}")
    print(f"Successfully Updated   : {updated_count}")
    print(f"Skipped / Not Found    : {skipped_count}")
    print(f"Mode                   : {'DRY RUN (No DB changes)' if dry_run else 'LIVE UPDATE (DB modified)'}")
    print("=" * 70 + "\n")


def delete_missing_companies_from_db(log_path: str, dry_run: bool = False):
    """
    Deletes rows from company_ats table if the company (and board) is NOT found in the log file
    AND its ats column is one of 'Workday', 'Greenhouse', 'Lever', or 'Ashby' (case-insensitive).
    """
    log_comps, log_boards = extract_all_companies_from_log(log_path)
    target_ats = {"workday", "greenhouse", "lever", "ashby"}

    print(f"\nChecking DB companies against log '{log_path}'...")
    print(f"Extracted {len(log_comps)} unique company names and {len(log_boards)} unique board names from log.")
    print(f"Target ATS filter for deletion: {', '.join(sorted(target_ats))}\n" + "=" * 70)

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT company, board, ats FROM company_ats;")
    rows = cur.fetchall()

    deleted_count = 0
    kept_count = 0

    for idx, (comp, board, ats) in enumerate(rows, start=1):
        comp_str = (comp or "").strip()
        board_str = (board or "").strip()
        ats_str = (ats or "").strip().lower()

        comp_match = comp_str.lower() in log_comps if comp_str else False
        board_match = board_str.lower() in log_boards if board_str else False
        ats_match = ats_str in target_ats

        if not (comp_match or board_match) and ats_match:
            print(f"[{idx}/{len(rows)}] REMOVING MISSING COMPANY: '{comp_str}' (Board: '{board_str}', ATS: '{ats}')")
            if not dry_run:
                if comp_str:
                    cur.execute("DELETE FROM company_ats WHERE company = %s;", (comp_str,))
                else:
                    cur.execute("DELETE FROM company_ats WHERE board = %s;", (board_str,))
                print(f"  -> Successfully deleted from DB.")
            else:
                print(f"  -> [DRY RUN] Would DELETE company '{comp_str}' from company_ats.")
            deleted_count += 1
            print("-" * 70)
        else:
            kept_count += 1

    cur.close()
    conn.close()

    print("\n" + "=" * 70)
    print("DELETE MISSING SUMMARY:")
    print(f"Total DB Rows Evaluated        : {len(rows)}")
    print(f"Kept (In log or non-target ATS): {kept_count}")
    print(f"Deleted (Not in log & target)  : {deleted_count}")
    print(f"Mode                           : {'DRY RUN (No DB changes)' if dry_run else 'LIVE UPDATE (DB modified)'}")
    print("=" * 70 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Update company_ats table from log fixes, and optionally remove missing companies.")
    parser.add_argument("--log", default=LOG_FILE, help="Path to log file (default: log.txt)")
    parser.add_argument("--dry-run", action="store_true", help="Run without applying changes to DB")
    parser.add_argument("--delete-missing", action="store_true", help="Remove rows from company_ats DB if company is not found in the log file")
    args = parser.parse_args()

    blocks = read_log_blocks(args.log)
    actions = []

    for b in blocks:
        act = parse_block(b)
        if act:
            actions.append(act)

    print(f"Parsed {len(actions)} fix/internal instructions from {args.log}.")
    update_company_ats_table(actions, dry_run=args.dry_run)

    if args.delete_missing:
        delete_missing_companies_from_db(args.log, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
