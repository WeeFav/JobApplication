import React, { useState, useEffect, useRef } from "react";
import JobSearchBar from "./JobSearchBar";
import JobList from "./JobList";
import JobDetails from "./JobDetails";
import ResumeToggle from "./ResumeToggle";

const PAGE_SIZE = 25;

const JobContainer = ({ fetchJobs, activeId = null, setActiveId = null, tab = "all" }) => {
  const [jobs, setJobs] = useState([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [page, setPage] = useState(1);
  const [searchFilters, setSearchFilters] = useState({ jobTitle: '', company: '', score: '' });
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const containerRef = useRef(null);

  const loadData = async (targetPage, filters) => {
    setLoading(true);
    try {
      const data = await fetchJobs({
        page: targetPage,
        limit: PAGE_SIZE,
        activeId,
        ...filters
      });

      const jobList = Array.isArray(data) ? data : (data.jobs || []);
      const total = Array.isArray(data) ? data.length : (data.total ?? jobList.length);

      setJobs(jobList);
      setTotalJobs(total);
      setPage(targetPage);
      setSelectedJob(jobList.length > 0 ? jobList[0] : null);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setJobs([]);
      setTotalJobs(0);
      setSelectedJob(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearchFilters({ jobTitle: '', company: '', score: '' });
    loadData(1, { jobTitle: '', company: '', score: '' });
  }, [activeId, tab]);

  const onSearchClick = (jobTitle, company, score) => {
    const newFilters = { jobTitle, company, score };
    setSearchFilters(newFilters);
    loadData(1, newFilters);
  };

  const onPageChange = (newPage) => {
    loadData(newPage, searchFilters);
  };

  const handleDelete = async () => {
    if (!selectedJob) return;
    const confirm = window.confirm('Are you sure you want to delete this job?');
    if (confirm) {
      await deleteJobHandler(selectedJob.id);
      const newTotal = Math.max(0, totalJobs - 1);
      const totalPages = Math.ceil(newTotal / PAGE_SIZE);
      const targetPage = page > totalPages ? Math.max(1, totalPages) : page;
      loadData(targetPage, searchFilters);
    }
  };

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo(0, 0);
    }
  }, [selectedJob]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Search Bar */}
      <div className="px-7 my-6">
        <JobSearchBar onSearchClick={onSearchClick} tab={tab} />
      </div>

      {(activeId !== null && setActiveId) ?
        <div className="flex items-center justify-center mb-3">
          <ResumeToggle activeId={activeId} setActiveId={setActiveId} />
        </div>
        :
        <></>
      }

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {loading ? (
          <div className="flex flex-1 items-center justify-center bg-white">
            <h2 className="text-xl font-semibold text-gray-500 animate-pulse">Loading...</h2>
          </div>
        ) : (
          <>
            {/* Left Job List */}
            <div className="w-1/3 border-r flex flex-col h-full bg-white overflow-hidden">
              <JobList 
                jobs={jobs} 
                totalJobs={totalJobs} 
                page={page} 
                pageSize={PAGE_SIZE} 
                onPageChange={onPageChange} 
                onSelectJob={setSelectedJob} 
                selectedJob={selectedJob} 
              />
            </div>

            {/* Right Job Details */}
            <div ref={containerRef} className="flex-1 overflow-y-auto bg-gray-100">
              {selectedJob ? (
                <JobDetails job={selectedJob} handleDelete={handleDelete} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Select a job to view details
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default JobContainer;

/* 
===============================================================================
API
===============================================================================
*/
const deleteJobHandler = async (id) => {
  const res = await fetch(`/python_api/jobs?id=${id}`, {
    method: 'DELETE'
  });
};