import React, { useState, useEffect, useRef } from "react";
import JobSearchBar from "../components/Jobs/JobSearchBar"
import JobList from "../components/Jobs/JobList";
import JobDetails from "../components/Jobs/JobDetails";
import ResumeToggle from "../components/Jobs/ResumeToggle";

const RecommendedJobsPage = () => {
  const [jobs, setJobs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo(0, 0);
    }
  }, [selectedJob]);

  useEffect(() => {
    setLoading(true);
    loadJobs(setJobs, setLoading);
  }, [])

  const onSearchClick = async (jobTitle, company) => {
    setLoading(true);
    setJobs(await searchJobHandler(jobTitle, company));
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {loading ? <h2>Loading...</h2> :
        <>
        {/* Top Search Bar */}
        <div className="px-7 my-6">
          <JobSearchBar onSearchClick={onSearchClick} tab="all" />
        </div>

        <div className="flex items-center justify-center">
          <ResumeToggle />
        </div>

        {/* Main Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Job List */}
          <div className="w-1/3 border-r overflow-y-auto bg-white">
            <JobList jobs={jobs} onSelectJob={setSelectedJob} selectedJob={selectedJob} />
          </div>

          {/* Right Job Details */}
          <div ref={containerRef} className="flex-1 overflow-y-auto bg-gray-100">
            {selectedJob ? (
              <JobDetails job={selectedJob} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Select a job to view details
              </div>
            )}
          </div>
        </div>
        </>
      }
    </div>
  )
}

export default RecommendedJobsPage

/* 
===============================================================================
API
===============================================================================
*/
const loadJobs = async (setJobs, setLoading) => {
    const res = await fetch(`/api/recommendations`);
    const data = await res.json();
    setJobs(data);
    setLoading(false);
}

// function to search job
const searchJobHandler = async (jobTitle, company) => {
  const res = await fetch(`/api/jobs?jobTitle=${jobTitle}&company=${company}`);
  const data = await res.json();
  return data;
}