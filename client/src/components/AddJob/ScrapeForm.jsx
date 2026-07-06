import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ProgressContext } from "../../context/ProgressContext";

const ScrapeForm = () => {
  const [jobsite, setJobsite] = useState("linkedin");
  const [numJobs, setNumJobs] = useState(10);
  const [companies, setCompanies] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const dropdownRef = useRef(null);
  const { addJobsiteScrape } = useContext(ProgressContext);
  const navigate = useNavigate();

  // Fetch companies from python API
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch("/python_api/companies");
        if (res.ok) {
          const data = await res.json();
          setCompanies(data.map(name => ({ label: name, value: name, isCompany: true })));
        }
      } catch (error) {
        console.error("Error fetching companies:", error);
      }
    };
    fetchCompanies();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const defaultOptions = [
    { label: "LinkedIn", value: "linkedin", isCompany: false },
    { label: "JobRight", value: "jobright", isCompany: false }
  ];

  const allOptions = [...defaultOptions, ...companies];
  const filteredOptions = allOptions.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = allOptions.find(opt => opt.value === jobsite) || defaultOptions[0];

  const handleScrape = (e) => {
    e.preventDefault();
    addJobsiteScrape(jobsite, selectedOption.isCompany ? 0 : Number(numJobs));
    navigate('/dashboard');
  };

  return (
    <form onSubmit={handleScrape} className="space-y-4">
      {/* Choose Jobsite */}
      <div className="mb-4 relative" ref={dropdownRef}>
        <label className="block text-gray-700 font-bold mb-2">
          Choose Jobsite / Company
        </label>
        
        {/* Dropdown Button */}
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="border rounded w-full py-2 px-3 bg-white text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-website-blue"
        >
          <span>{selectedOption.label}</span>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Panel */}
        {isDropdownOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {/* Search Input */}
            <div className="sticky top-0 bg-white p-2 border-b border-gray-100">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border rounded py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-website-blue"
              />
            </div>
            
            {/* Options List */}
            <ul className="py-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <li
                    key={opt.value}
                    onClick={() => {
                      setJobsite(opt.value);
                      setIsDropdownOpen(false);
                      setSearchTerm("");
                    }}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                      opt.value === jobsite ? "bg-blue-50 font-semibold text-website-blue" : "text-gray-700"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {opt.isCompany && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full uppercase">
                        ATS Company
                      </span>
                    )}
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-sm text-gray-500 text-center">No options found</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Number of Jobs (Only visible if not a company board) */}
      {!selectedOption.isCompany && (
        <div className="mb-4">
          <label className="block text-gray-700 font-bold mb-2">
            Number of Jobs
          </label>
          <input
            type="number"
            value={numJobs}
            min={1}
            onChange={(e) => setNumJobs(e.target.value)}
            className="border rounded w-full py-2 px-3 text-black focus:outline-none focus:ring-2 focus:ring-website-blue"
            required
          />
        </div>
      )}

      {/* Submit Button */}
      <div>
        <button
          type="submit"
          className="bg-website-blue hover:bg-website-gold text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline flex items-center justify-center transition-colors"
        >
          Scrape jobs
        </button>
      </div>
    </form>
  );
};

export default ScrapeForm;
