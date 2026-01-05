import { useEffect, useState } from "react";

const JobSearchBar = ({ onSearchClick }) => {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [score, setScore] = useState("");

  return (
    <div className="flex flex-row gap-4">
      {/* Job Title Input */}
      <div className="flex-grow">
        <label htmlFor="job-title" className="block text-sm font-medium text-gray-700 mb-1">
          Job Title
        </label>
        <input
          id="job-title"
          type="text"
          placeholder="e.g., Software Engineer"
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-website-blue"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Company Input */}
      <div className="flex-grow">
        <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
          Company
        </label>
        <input
          id="Company"
          type="text"
          placeholder="e.g., Apple"
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-website-blue"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      {/* Score Input
      {tab === 'rec' ?
        <div className="flex-grow">
          <label htmlFor="score" className="block text-sm font-medium text-gray-700 mb-1">
            Score
          </label>
          <input
            id="score"
            type="number"
            placeholder="minimum score"
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-website-blue"
            value={score}
            onChange={(e) => setScore(e.target.value)}
          />
        </div>
        :
        <></>
      } */}


      {/* Search Button */}
      <button
        className="bg-website-gold hover:bg-website-darkGold text-white rounded mt-6 px-4"
        onClick={() => onSearchClick(title, company)}
      >
        Search
      </button>
    </div>
  );
}

export default JobSearchBar