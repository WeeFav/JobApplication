# Test Plan & Feature Specifications: Job Application Tracker & Recommendation Engine

This document outlines the detailed specifications and verification procedures for each feature of the Job Application website.

---

## 2. Dashboard Ingestion & Live Progress (`/dashboard`)

Verify status aggregation counters and live WebSocket pipeline updates.

### Feature 2.1: Status Aggregation Counters
*   **Description**: The dashboard aggregates and displays key pipeline metrics:
    1. **Total Scraped Jobs**: The total count of jobs stored in the PostgreSQL database (matching the number of rows in the `jobs` table without filters).
    2. **Applied Jobs**: The total count of jobs the user has marked as applied.
    3. **Recommended Jobs**: The total count of jobs recommended for the user's first resume.
*   **Test Action**: Note down the count values shown in the **Total Scraped Jobs**, **Applied Jobs**, and **Recommended Jobs** cards.
*   **Verification**:
    *   **Total Scraped Jobs** count should match the number of jobs in PostgreSQL without any filter.
    *   Navigate to **Applied Jobs**, count the total list items, and verify it matches the **Applied Jobs** count.
    *   Navigate to **Recommended Jobs**, count the items for the first resume, and verify it matches the **Recommended Jobs** count.

### Feature 2.2: Ingestion Task Pipeline
*   **Description**: Displays dynamic, animated progress status of background jobs added manually or scraped. The stages are Scraping (for URL or site scraper), PostgreSQL Insert, Qdrant Insert, and Recommending. User can clear a task card once completed or failed.
*   **Test Action**: Ingest a new job (via any tab in **Add Job**).
*   **Verification**:
    *   Observe immediate redirection to the **Dashboard**.
    *   Confirm a progress card appears displaying the correct target source/title and an active progress bar.
    *   Verify the step icons animate dynamically (pulse/spin) as they proceed:
        1. `Scraping` (running $\rightarrow$ success, or skipped for manual)
        2. `PostgreSQL Insert` (running $\rightarrow$ success)
        3. `Qdrant Insert` (running $\rightarrow$ success)
        4. `Recommending` (running $\rightarrow$ success)
    *   Once the state is `completed` (success) or `failed`, verify that a close icon button (`X`) appears on the top-right of the progress card.
    *   Click `X` and verify the card is removed from the DOM and does not reappear on page reload.

---

## 3. Job Listings Management (`/jobs`)

Verify pagination, item details rendering, and core job modifications.

### Feature 3.1: Job Directory Layout & Pagination
*   **Description**: Left panel lists all jobs with pagination and selection highlights. Right panel shows details of the selected job, resetting scroll position when swapping items.
*   **Test Action**: Select different jobs on the left-side panel.
*   **Verification**:
    *   Verify the selected card is highlighted (in light blue) and details load on the right panel.
    *   Verify the scroll position of the right details pane resets to the top when switching jobs.

### Feature 3.2: Job Details & Keyword Highlighting
*   **Description**: Displays selected job details (title, company, location, dates, description). Highlights extracted skill keywords dynamically, and links out to the original application via "Apply Now".
*   **Test Action**: Inspect the details of a selected job.
*   **Verification**:
    *   Verify that company name, title, location, scrape date, and post date are correctly formatted.
    *   Confirm that keywords in the **extracted description** are outlined in gold and highlighted in amber-50 (verifying `findSkillMatches` is working).
    *   Click the **Apply Now** button. Verify it opens the original job posting URL in a new browser tab.

### Feature 3.3: Application Status Tracking
*   **Description**: Toggle application status for jobs, writing/deleting Postgres entries and updating Qdrant payload flag `"applied"`.
*   **Test Action**: Click the **Mark as Applied** button on a job card.
*   **Verification**:
    *   Verify the button text changes to **Remove from Applied** and color changes to red.
    *   Go to pgAdmin or query PG: `SELECT * FROM applications WHERE job_id = <id>;` and verify a record is inserted.
    *   Verify Qdrant payload is updated. In Qdrant UI/REST: check point `<id>` payload has `"applied": true`.
    *   Click **Remove from Applied**. Verify the button changes back, the database record is deleted, and the Qdrant payload switches to `"applied": false`.

### Feature 3.4: Job Search
*   **Description**: Search filters to find jobs matching title or company keywords.
*   **Test Action**: In the search header, input a keyword in **Job Title** (e.g., "Engineer") and click **Search**.
*   **Verification**: Confirm all jobs in the list contain "Engineer" in their title. Clear search and repeat for the **Company** input.

### Feature 3.5: Job Deletion
*   **Description**: Deletes job from PostgreSQL and removes its vector index from Qdrant, automatically updating the active selection in the UI directory.
*   **Test Action**: Select a job, click **Delete**, and click **OK** on the alert confirmation.
*   **Verification**:
    *   Confirm the deleted job is removed from the left-side list.
    *   Verify the selection automatically shifts to the adjacent job (previous or next).
    *   Check Postgres (`SELECT * FROM jobs WHERE id = <id>;`) and verify the row is deleted.
    *   Check Qdrant and verify the point with ID `<id>` is removed.

---

## 4. Add Job Options (`/add-job`)

Verify the three job ingestion channels, duplicate prevention (de-duplication), and error reporting.

### Feature 4.1: Manual Job Ingestion
*   **Description**: Add a job manually by filling out its form, direct inserting to Postgres and Qdrant.
*   **Test Action**: Go to **Manual**, fill out Title, Company, Location, a valid URL, and a Description. Click **Add Job**.
*   **Verification**:
    *   Ensure dashboard shows a progress card starting directly at `PostgreSQL Insert` (with `Scraping` pre-marked as `success` / skipped).
    *   Once complete, verify the job is present on the **Jobs** tab and that keywords/skills are extracted.

### Feature 4.2: Single URL Scrape & Ingest
*   **Description**: Provide a URL to automatically scrape job details (LinkedIn, Jobright, etc.) and launch the insertion pipeline.
*   **Test Action**: Go to **From URL**, input a valid LinkedIn job URL, and click **Add Job**.
*   **Verification**:
    *   Confirm the dashboard progress bar updates through the `Scraping` phase.
    *   Verify the job properties (company, title, location, description) are populated correctly.

### Feature 4.3: Mass Jobsite Scraper
*   **Description**: Scrapes multiple jobs from LinkedIn or JobRight according to a specified count.
*   **Test Action**: Go to **Scrape**, select "LinkedIn" or "JobRight", set the number of jobs to 5, and click **Scrape jobs**.
*   **Verification**:
    *   Confirm dashboard shows `Scraping (0 done)`.
    *   Verify the count increments on-screen (e.g. `(1 done)`) as Playwright fetches jobs in the background.
    *   Ensure the postgres and qdrant insert counts correspond to the final scraped results.

### Feature 4.4: ATS Filtering & Scraping
*   **Description**: Scrapes company boards (Greenhouse, Lever, Ashby, Workday), filtering to include only US-based internship roles.
*   **Test Action**: Select an ATS Company board (e.g., "SpaceX"), which disables the "Number of Jobs" input. Click **Scrape jobs**.
*   **Verification**:
    *   Verify only jobs containing the keyword "intern" and matching the USA location criteria are added to the list.

### Feature 4.5: Duplication Guard (Hash Checking)
*   **Description**: Computes a unique hash per job (Title + Company + Normalized URL) to prevent duplicates from inserting twice, incrementing the "skipped" task count in the progress dashboard instead.
*   **Test Action**: Try to add or scrape a job with the exact same combination of `lowercase(Title) + lowercase(Company) + normalized(URL)` that already exists in the system.
*   **Verification**:
    *   On the dashboard progress list, confirm that the `PostgreSQL Insert` phase completes but displays `Skipped jobs: 1` and `Inserted jobs: 0`.
    *   Verify no duplicate records are created in Postgres or Qdrant.

### Feature 4.6: Ingestion Pipeline Error Handling
*   **Description**: Captures errors at any stage of ingestion (scraping/db/vector db/recommendation) and displays a detailed error banner in the task card.
*   **Test Action**: Trigger an error (e.g., feed an invalid URL structure to **From URL** or turn off the internet connection).
*   **Verification**:
    *   Confirm the dashboard progress card turns red, stage is marked `failed`, and a banner displaying the specific error message is shown.

---

## 5. Job Editing (`/jobs/edit/:id`)

Verify the update page validation, WebSocket update notifications, and re-recommendation trigger.

> [!WARNING]
> **Codebase Alert**: The `/update_job` WebSocket endpoint inside `python_app/main.py` is currently commented out at lines 123-135. Because of this, clicking "Update Job" on the frontend will trigger a connection error ("Connection closed unexpectedly") on the socket. This must be uncommented in the code before the edit feature can pass this test!

### Feature 5.1: Job Metadata Editing
*   **Description**: Form to edit job title, company, location, URL, or post date, updating Postgres.
*   **Test Action**: Edit a job's Title, Company, URL, or Date. Click **Update Job**.
*   **Verification**:
    *   Verify the job list updates the item's info.
    *   Verify the PostgreSQL `jobs` table has updated fields.
    *   *(If description is unchanged)*: Verify that Qdrant is not re-embedded.

### Feature 5.2: Job Description Modification
*   **Description**: Modifying job descriptions triggers full re-embedding to Qdrant and recalculation of recommendation scores.
*   **Test Action**: Modify the Job Description content and click **Update Job**.
*   **Verification**:
    *   Verify that `descriptionUpdated` is passed as `true` in the socket payload.
    *   Verify that Qdrant is updated with the new vector embedding.
    *   Verify that `recommend_by_job` is rerun, and matching recommendation scores in the `recommendations` table are updated.

---

## 6. Recommendations (`/recommended-jobs`)

Verify resume-to-job pairing logic, scoring accuracy, and navigation.

### Feature 6.1: Resume Toggle on Recommendations
*   **Description**: Switch between resumes to show recommendations and custom scores matching that specific resume.
*   **Test Action**: Click between different resume buttons on the header of the Recommended Jobs page.
*   **Verification**:
    *   Confirm the active resume button is highlighted in gold.
    *   Verify the job list immediately reloads and shows only recommendations corresponding to the selected resume.

### Feature 6.2: Recommendation Ranking & Visual Scores
*   **Description**: Displays recommendations sorted by score descending, with a gold Gauge matching the match percentage.
*   **Test Action**: Inspect the recommendation list.
*   **Verification**:
    *   Verify each job card shows a gold radial Gauge representing the match percentage.
    *   Confirm the jobs are sorted in descending order of the match percentage (`final_score`).
    *   Verify that jobs marked as applied are excluded from this list.

---

## 7. Applied Jobs Page (`/applied-jobs`)

Verify tracking of candidate actions and application listings.

### Feature 7.1: Applied Jobs Catalog
*   **Description**: Isolates applied listings in a directory view without showing match scores.
*   **Test Action**: Visit the **Applied Jobs** page.
*   **Verification**:
    *   Verify that only jobs marked as applied are displayed.
    *   Confirm that no Gauges (scores) are shown next to the cards (only the standard title, company, location, post date).

### Feature 7.2: Quick Application Removal
*   **Description**: Easily unmark applied jobs, removing them from the Applied view immediately.
*   **Test Action**: Click a job on the list, and in details, click **Remove from Applied**.
*   **Verification**:
    *   Verify the job is instantly removed from the left-hand list.
    *   Confirm selection jumps to the next available applied job.

---

## 8. Resumes & Profiles (`/profile`)

Verify resume updates, preview formatting, name vs. content modification flags, and database sync.

### Feature 8.1: Resume Lifecycle Management
*   **Description**: Create, rename, delete resumes in the Postgres resumes list.
*   **Test Action**: Click **Add** in the Resumes tab. Rename the resume (double-click tab). Click **Save**.
*   **Verification**:
    *   Verify the resume is inserted into PostgreSQL (`resumes` table).
    *   Click the **Delete** button next to a resume tab. Verify it is removed from the database.

### Feature 8.2: Dynamic Resume Re-recommendation
*   **Description**: Saving changes to a resume detects if only metadata changed (no recommendation needed) or content changed (triggers full vector recalculation and similarity scoring).
*   **Test Action Case A (Rename Only)**: Change the name of a resume without touching its content. Click **Save**.
*   **Verification Case A**:
    *   Verify a WebSocket connection is opened.
    *   Verify the backend performs a database name update (`update_name`) but the recommendation pipeline is **not** triggered.
*   **Test Action Case B (Content Change)**: Modify the text of a resume. Click **Save**.
*   **Verification Case B**:
    *   Verify the WebSocket receives the update, calculates the new vector embedding, and updates the `resumes` table.
    *   Verify the progress popup indicates **Start recommend** followed by **Recommend success**.
    *   Verify that the `recommendations` table contains new similarity, keyword, and embedding scores for all active jobs in the DB.

### Feature 8.3: Resume Preview & Skill Highlighting
*   **Description**: View parsed resume keywords dynamically highlighted with hover info in preview mode.
*   **Test Action**: Paste a resume containing standard engineering skills (e.g., "Python", "SQL") and save it. Exit Edit mode by clicking **Preview**.
*   **Verification**:
    *   Confirm the preview renders the resume text with matching skills highlighted in gold borders and amber background.
    *   Confirm hovering over a highlighted skill displays a tooltip `"Skill: <SkillName>"`.

---

## 9. System Integrity (`/profile` -> System Check)

Verify consistency between relational database structures and vector indexes.

### Feature 9.1: Relational vs Vector DB Sync Checks
*   **Description**: Audits Postgres vs Qdrant database differences (missing ids, mismatched scraping dates) and reports health status.
*   **Test Action**: Visit the **System Check** tab.
*   **Verification**:
    *   If there are mismatched items (e.g., "Jobs in database but not qdrant"), verify that they display a red alert box indicating the number of issues.
    *   If indices are fully synced, confirm the boxes display in green with `0 issue(s) detected`.
