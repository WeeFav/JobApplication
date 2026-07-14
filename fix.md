[DONE] Feature 6.2: Verify that only jobs with > 50% score are shown in the right panel.
[DONE] Feature 2.1: **Recommended Jobs** count should match the number of recommended jobs in with filter
[DONE] Feature 2.1: **Total Scraped Jobs** count should match the number of jobs in PostgreSQL without any filter.
[DONE] Feature 2.2: URL scrape didn't increment "Scraped jobs" counter
[DONE] Feature 2.2: Manual job didn't show Scraped jobs, Inserted jobs, Skipped jobs counters

[DONE] searched text should remain in the search bar
[DONE] jobs, recommend, and applied page should show number of results found and should display c
[CHECK] more rigourours deduplication espcially on src
[CHECK] when scraping ats, remove html tags from description

[NOT-IMPLEMENTED] for edit job, client should send updated job info and whether description is updated. so in insert_jobs(), pass isUpdate=True to let function know to ignore deduplication. also pass isDescriptionUpdate=True to let function know to update qdrant. if isDescriptionUpdate=False, don't need to recommend

[DONE] Feature 6.2: radial Gauge have different size
[DONE] Feature 8.1: Click the **Delete** button next to a resume tab. Verify it is removed from the database.
[DONE] shouldn't be able to edit resume name in preview mode
[DONE] if nothing change, it still shows got 2 name only updates
[CHECK] keyword_scoring need to handle empty skills list
[DONE] resume recommendation change from notification to status in progress bar in dashboard
[DONE] full update got stuck
[DONE] same resume have different score
why some jobs have "WRAN: job skill list empty!!! Skipping embedding score"