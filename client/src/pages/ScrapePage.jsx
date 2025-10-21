import React, { useState, useRef } from "react";

const ScrapePage = () => {
  const [jobsite, setJobsite] = useState("linkedin");
  const [numJobs, setNumJobs] = useState(10);
  const wsRef = useRef(null);

  const handleScrape = () => {
    let scrapeInfo = {
      jobsite: jobsite,
      numJobs: numJobs
    }

    scrapeHandler(scrapeInfo, wsRef);
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
            min="1"
            value={numJobs}
            onChange={(e) => setNumJobs(e.target.value)}
            className="w-full p-2 rounded-lg  text-black focus:outline-none focus:ring-2"
          />
        </div>

        {/* Button */}
        <button
          onClick={handleScrape}
          className="w-full bg-website-gold text-white font-medium py-2 px-4 rounded-lg transition-all"
        >
          Scrape
        </button>
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

// function to add job
const scrapeHandler = async (scrapeInfo, wsRef) => {
  // Create socket
  const ws = new WebSocket('ws://localhost:8000');
  wsRef.current = ws;

  ws.onopen = () => {
    console.log('Connected to WebSocket');
    ws.send(JSON.stringify({ type: 'start' })); // optional: tell backend to start
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    console.log(msg.data);

    if (msg.type === 'done') {
      console.log('Task done, closing socket');
      ws.close();
    }
  };

  ws.onclose = () => {
    console.log('Socket closed');
    wsRef.current = null;
  };
};