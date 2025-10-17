import React, { useState } from "react";

const ScrapePage = () => {
  const [jobsite, setJobsite] = useState("linkedin");
  const [numJobs, setNumJobs] = useState(10);

  const handleScrape = () => {
    console.log(`Scraping ${numJobs} jobs from ${jobsite}`);
    // TODO: connect with backend scraping API or logic here
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
            className="w-full p-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            className="w-full p-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Button */}
        <button
          onClick={handleScrape}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-all"
        >
          Scrape
        </button>
      </div>
    </div>
  )
}

export default ScrapePage