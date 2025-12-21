import React, { useState, useRef } from "react";
import CircularProgress from '@mui/material/CircularProgress';

const ScrapePage = () => {
  const [jobsite, setJobsite] = useState("linkedin");
  const [numJobs, setNumJobs] = useState(10);
  const [scrapeNum, setScrapeNum] = useState(0);
  const [isScraping, setIsScraping] = useState(false);
  const [insertNum, setInsertNum] = useState(0);
  const [isInserting, setIsInserting] = useState(false);
  const [isRecommending, setIsRecommending] = useState(false);
  const wsRef = useRef(null);

  const handleScrape = async () => {
    setScrapeNum(0); // reset count

    let scrapeInfo = {
      jobsite: jobsite,
      numJobs: Number(numJobs)
    }

    await scrapeHandler(scrapeInfo, wsRef, setScrapeNum, setIsScraping, setInsertNum, setIsInserting, setIsRecommending);
  };

  return (
    <div className="flex flex-col flex-grow items-center justify-center text-white">
      <div className="bg-website-blue p-8 rounded-2xl shadow-lg w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-6">Job Scraper</h1>

        {/* Dropdown */}
        <div className="mb-4">
          <label className="block text-sm mb-2 text-gray-300">
            Choose Jobsite
          </label>
          <select
            value={jobsite}
            onChange={(e) => setJobsite(e.target.value)}
            className="w-full p-2 rounded-lg text-black focus:outline-none focus:ring-2"
          >
            <option value="linkedin">LinkedIn</option>
            <option value="jobright">JobRight</option>
          </select>
        </div>

        {/* Number of jobs */}
        <div className="mb-6">
          <label className="block text-sm mb-2 text-gray-300">
            Number of Jobs
          </label>
          <input
            type="number"
            value={numJobs}
            onChange={(e) => setNumJobs(e.target.value)}
            className="w-full p-2 rounded-lg  text-black focus:outline-none focus:ring-2"
          />
        </div>

        {/* Button */}
        <button
          disabled={isScraping || isInserting || isRecommending}
          onClick={handleScrape}
          className="w-full bg-website-gold text-white font-medium py-2 px-4 rounded-lg transition-all flex items-center justify-center"
        >
          {isScraping || isInserting || isRecommending ? (
            <div className="flex items-center gap-3">
              <p>
                {isScraping && "Scraping"}
                {isInserting && "Inserting"}
                {isRecommending && "Recommending"}
              </p>
              <CircularProgress size="20px" color="white" />
            </div>
          ) : (
            "Scrape"
          )}
        </button>

        {/* Scrape Progress Display */}
        {isScraping || isInserting || isRecommending ?
          <div className="mt-6 bg-gray-800 rounded-lg p-4">
            <p className="text-lg font-medium">
                {isScraping && "Scraped Jobs: "}
                {isInserting && "Inserted Jobs: "}
                {isRecommending && "Recommended Jobs: "}
              <span className="text-website-gold font-bold">
                {isScraping && scrapeNum}
                {isInserting && insertNum}
              </span>
            </p>
          </div>
          :
          <></>
        }

      </div>
    </div>
  )
}

export default ScrapePage


/* 
===============================================================================
API
===============================================================================
*/

const scrapeHandler = async (scrapeInfo, wsRef, setScrapeNum, setIsScraping, setInsertNum, setIsInserting, setIsRecommending) => {
  // Create socket
  const ws = new WebSocket('/ws_api/scrape_jobsite');
  wsRef.current = ws;
  let scrapeNum = 0;
  let insertNum = 0;

  ws.onopen = () => {
    console.log('Connected to WebSocket');
    ws.send(JSON.stringify(scrapeInfo));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "scrape") {
      if (msg.start) {
        console.log("start scrape");
        setIsScraping(true);
      }
      else if (msg.update) {
        scrapeNum++;
        setScrapeNum(scrapeNum);
        console.log(`${scrapeNum} jobs scraped`);
      }
      else if (msg.success) {
        console.log("Job scrape success");
        setIsScraping(false);
      }
      else if (msg.fail) {
        console.log("Job scrape failed");
        setIsScraping(false);
      }
    }
    else if (msg.type === "insert") {
      if (msg.start) {
        console.log("start insert");
        setIsInserting(true);
      }
      else if (msg.update) {
        insertNum++;
        setInsertNum(insertNum);
        console.log(`${insertNum} jobs inserted`);
      }
      else if (msg.success) {
        console.log("Job insert success");
        setIsInserting(false);
      }
      else if (msg.fail) {
        console.log("Job insert failed");
        setIsInserting(false);
      }
    }
    else if (msg.type === "recommend") {
      if (msg.start) {
        console.log("start recommend");
        setIsRecommending(true);
      }
      else if (msg.success) {
        console.log("Recommend success");
        setIsRecommending(false);
      }
      else if (msg.fail) {
        console.log("Recommend failed");
        setIsRecommending(false);
      }
    }
  };

  ws.onclose = () => {
    console.log('Socket closed');
    wsRef.current = null;
  };

};