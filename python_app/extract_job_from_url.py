"""
Extract job title, company, date posted, and description from a job posting URL.

Pipeline:
    1. Playwright  -> fetch fully rendered HTML (handles JS-heavy ATS pages)
    2. BeautifulSoup (optional, default on) -> strip noise, preserve JSON-LD & readable text
    3. Gemini LLM via LangChain (structured output) -> {job_title, company, date_posted, description}

Usage:
    python extract_job_from_url.py <url>
    python extract_job_from_url.py <url> --no-bs4          # send raw HTML to the LLM
    python extract_job_from_url.py <url> --headful         # show the browser
    python extract_job_from_url.py <url> --out result.json # save output
    python extract_job_from_url.py <url> --model gemini-3.8-flash

Requires: playwright, beautifulsoup4, langchain-google-genai, python-dotenv
          and `playwright install chromium`. GOOGLE_API_KEY must be set in .env.
"""

import os
import sys
import json
import re
import argparse

from dotenv import load_dotenv
from pydantic import BaseModel, Field
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from bs4 import BeautifulSoup
from langchain_google_genai import ChatGoogleGenerativeAI

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# .env lives at the repo root (JobApplication-dev/.env)
for env_path in (
    os.path.join(BASE_DIR, ".env"),
    os.path.join(BASE_DIR, "..", ".env"),
    os.path.join(BASE_DIR, "..", "..", ".env"),
):
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break

MODEL_NAME = "gemini-3.5-flash-lite"
# Rough cap on characters sent to the LLM to keep cost/latency bounded
MAX_INPUT_CHARS = 200_000

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


class JobPosting(BaseModel):
    job_title: str = Field(description="The exact job title of the posting. Empty string if not found.")
    company: str = Field(description="The name of the hiring company. Empty string if not found.")
    date_posted: str = Field(
        description=(
            "The date the job was posted (e.g., in ISO format like YYYY-MM-DD, or as written "
            "on the page / in JSON-LD datePosted). Empty string if not found."
        )
    )
    description: str = Field(
        description=(
            "The full job description, including responsibilities, qualifications, "
            "requirements, benefits, location and compensation if present. Preserve the "
            "original wording and keep section structure using plain-text line breaks and "
            "bullet points. Exclude site navigation, cookie banners, footers, and unrelated jobs. "
            "Empty string if not found."
        )
    )


PROMPT = """You are an information extraction system.

Below is the content of a web page that should contain a single job posting.
Source URL: {url}
Page title: {page_title}

Extract:
- job_title: the title of the job being posted
- company: the name of the hiring company (use the URL / page title as hints if the body doesn't state it)
- date_posted: the date the job was posted (look for JSON-LD datePosted or on-page text like 'Posted on', 'Date posted', etc.). Empty string if not found.
- description: the complete job description text, copied faithfully (do not summarize)

If the page does not contain a job posting, return empty strings.

Page content ({content_type}):
\"\"\"
{content}
\"\"\"
"""


# ---------------------------------------------------------------------------
# Step 1: Fetch rendered HTML with Playwright
# ---------------------------------------------------------------------------
def fetch_rendered_html(url: str, headless: bool = True, timeout_ms: int = 45_000) -> tuple[str, str]:
    """Return (html, page_title) of the fully rendered page."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        try:
            context = browser.new_context(user_agent=USER_AGENT, viewport={"width": 1366, "height": 900})
            page = context.new_page()
            page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)

            # Wait for network to settle; some sites never fully idle, so don't fail on it
            try:
                page.wait_for_load_state("networkidle", timeout=15_000)
            except PlaywrightTimeoutError:
                pass

            # Scroll to trigger lazy-loaded content
            page.evaluate(
                """async () => {
                    for (let i = 0; i < 10; i++) {
                        window.scrollBy(0, document.body.scrollHeight / 10);
                        await new Promise(r => setTimeout(r, 150));
                    }
                    window.scrollTo(0, 0);
                }"""
            )
            page.wait_for_timeout(1000)

            # Collect content from same-origin-or-not iframes (e.g. embedded Greenhouse boards)
            html = page.content()
            for frame in page.frames[1:]:
                try:
                    frame_html = frame.content()
                    if frame_html and len(frame_html) > 500:
                        html += f"\n<!-- iframe: {frame.url} -->\n{frame_html}"
                except Exception:
                    continue

            return html, page.title()
        finally:
            browser.close()


# ---------------------------------------------------------------------------
# Step 2: Deterministic Date Extraction & BeautifulSoup HTML Cleaning
# ---------------------------------------------------------------------------
def _find_date_in_json_obj(obj) -> str | None:
    """Recursively search for datePosted / datePublished in parsed JSON-LD objects."""
    if isinstance(obj, dict):
        for key in ("datePosted", "datePublished", "dateCreated"):
            val = obj.get(key)
            if isinstance(val, str) and val.strip():
                return val.strip()
        for v in obj.values():
            found = _find_date_in_json_obj(v)
            if found:
                return found
    elif isinstance(obj, list):
        for item in obj:
            found = _find_date_in_json_obj(item)
            if found:
                return found
    return None


def extract_date_deterministically(html: str) -> str | None:
    """
    Deterministically extracts the job posting date from:
      1. <script type="application/ld+json"> (e.g. schema.org JobPosting.datePosted)
      2. <meta> tags (itemprop="datePosted", article:published_time, etc.)
      3. <time> tags with datetime / itemprop="datePosted"
    """
    soup = BeautifulSoup(html, "html.parser")

    # 1. JSON-LD scripts
    for tag in soup.find_all("script", type="application/ld+json"):
        raw = tag.string or tag.get_text()
        if not raw or not raw.strip():
            continue
        try:
            data = json.loads(raw)
            found = _find_date_in_json_obj(data)
            if found:
                return found
        except Exception:
            # Fallback regex search within the JSON-LD snippet if malformed JSON
            match = re.search(r'"datePosted"\s*:\s*"([^"]+)"', raw)
            if match:
                return match.group(1).strip()

    # 2. Meta tags
    meta_attributes = [
        {"itemprop": "datePosted"},
        {"property": "article:published_time"},
        {"property": "og:article:published_time"},
        {"name": "date"},
        {"name": "pubdate"},
        {"name": "dc.date"},
    ]
    for attr in meta_attributes:
        tag = soup.find("meta", attrs=attr)
        if tag and tag.get("content"):
            content = tag["content"].strip()
            if content:
                return content

    # 3. Tag with itemprop="datePosted" or <time> tag
    elem = soup.find(attrs={"itemprop": "datePosted"})
    if elem:
        for key in ("content", "datetime"):
            if elem.get(key):
                return elem[key].strip()
        elem_text = elem.get_text(strip=True)
        if elem_text:
            return elem_text

    time_tag = soup.find("time", attrs={"datetime": True})
    if time_tag and time_tag.get("datetime"):
        return time_tag["datetime"].strip()

    return None


def html_to_text(html: str) -> str:
    """Strip scripts/styles/nav noise and return readable text with line breaks."""
    soup = BeautifulSoup(html, "html.parser")

    # Pull JSON-LD metadata (e.g. schema.org JobPosting / datePosted) first – it's often the cleanest source
    json_ld_chunks = []
    for tag in soup.find_all("script", type="application/ld+json"):
        raw = tag.string or tag.get_text()
        if raw and any(keyword in raw for keyword in ("JobPosting", "datePosted", "schema.org")):
            json_ld_chunks.append(raw.strip())

    for tag in soup(["script", "style", "noscript", "svg", "iframe", "header", "footer", "nav", "form", "button"]):
        tag.decompose()

    text = soup.get_text(separator="\n")
    lines = [line.strip() for line in text.splitlines()]
    text = "\n".join(line for line in lines if line)

    if json_ld_chunks:
        text = "[Structured JSON-LD Metadata]\n" + "\n".join(json_ld_chunks) + "\n\n[Visible page text]\n" + text
    return text


# ---------------------------------------------------------------------------
# Step 3: LLM extraction
# ---------------------------------------------------------------------------
def extract_with_llm(url: str, page_title: str, content: str, content_type: str, model: str = MODEL_NAME) -> JobPosting:
    llm = ChatGoogleGenerativeAI(model=model, temperature=0)
    structured_llm = llm.with_structured_output(JobPosting)

    if len(content) > MAX_INPUT_CHARS:
        content = content[:MAX_INPUT_CHARS]

    prompt = PROMPT.format(url=url, page_title=page_title, content_type=content_type, content=content)
    return structured_llm.invoke(prompt)


def extract_job(url: str, use_bs4: bool = True, headless: bool = True, model: str = MODEL_NAME) -> dict:
    print(f"[1/3] Fetching rendered page: {url}", file=sys.stderr)
    html, page_title = fetch_rendered_html(url, headless=headless)
    print(f"      Got {len(html):,} chars of HTML (title: {page_title!r})", file=sys.stderr)

    # 1. Deterministically check for date posted first (JSON-LD, meta tags, etc.)
    deterministic_date = extract_date_deterministically(html)
    if deterministic_date:
        print(f"      [Deterministic Date Found]: {deterministic_date}", file=sys.stderr)

    if use_bs4:
        print("[2/3] Cleaning HTML with BeautifulSoup", file=sys.stderr)
        content = html_to_text(html)
        content_type = "cleaned text"
        print(f"      Reduced to {len(content):,} chars", file=sys.stderr)
    else:
        print("[2/3] Skipping BeautifulSoup; sending raw HTML", file=sys.stderr)
        content = html
        content_type = "raw HTML"

    print(f"[3/3] Extracting with {model}", file=sys.stderr)
    result = extract_with_llm(url, page_title, content, content_type, model=model)
    res_dict = result.model_dump()

    # If date was found deterministically, prioritize it over LLM hallucination/format shifts
    if deterministic_date:
        res_dict["date_posted"] = deterministic_date

    return {"url": url, **res_dict}


def main():
    parser = argparse.ArgumentParser(description="Extract job title, company, and description from a job URL.")
    parser.add_argument("url", help="Job posting URL")
    parser.add_argument("--no-bs4", action="store_true", help="Send raw HTML to the LLM instead of cleaned text")
    parser.add_argument("--headful", action="store_true", help="Run the browser with a visible window")
    parser.add_argument("--out", help="Optional path to write JSON output")
    parser.add_argument("--model", default=MODEL_NAME, help=f"Gemini model name (default: {MODEL_NAME})")
    args = parser.parse_args()

    if not os.environ.get("GOOGLE_API_KEY"):
        sys.exit("GOOGLE_API_KEY is not set (check your .env).")

    result = extract_job(args.url, use_bs4=not args.no_bs4, headless=not args.headful, model=args.model)

    output = json.dumps(result, indent=2, ensure_ascii=False)
    print(output)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(output)
        print(f"Saved to {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
