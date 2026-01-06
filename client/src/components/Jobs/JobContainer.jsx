import React, { useState, useEffect, useRef } from "react";
import JobSearchBar from "./JobSearchBar";
import JobList from "./JobList";
import JobDetails from "./JobDetails";
import ResumeToggle from "./ResumeToggle";

const LIMIT = 25;

const JobContainer = ({ loadJobs, activeId = null, setActiveId = null }) => {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);

  const containerRef = useRef(null);
  const loadMoreRef = useRef(false); // used as lock 
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchParams, setSearchParams] = useState({ title: "", company: "" });

  // Scroll to top for job details
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo(0, 0);
    }
  }, [selectedJob]);

  // Initial Load
  useEffect(() => {
    const initLoad = async () => {
      loadMoreRef.current = true;
      const data = await loadJobs(0, LIMIT, searchParams.title, searchParams.company);
      setJobs(data);
      if (data.length > 0) setSelectedJob(data[0]);
      if (data.length < LIMIT) setHasMore(false);
      loadMoreRef.current = false;
    }
    
    initLoad();
  }, [])

  // Search Logic
  const onSearchClick = async (title, company) => {
    loadMoreRef.current = true;
    setOffset(0);
    setHasMore(true);
    setJobs([]);
    setSearchParams({ title: title, company });

    const data = await loadJobs(0, LIMIT, title, company);

    setJobs(data);
    setSelectedJob(data.length > 0 ? data[0] : null);
    if (data.length < LIMIT) setHasMore(false);
    loadMoreRef.current = false;
  };

  // Infinite Scroll Load Job
  const loadMore = async () => {
    if (loadMoreRef.current || !hasMore) return;

    loadMoreRef.current = true;
    const nextOffset = offset + LIMIT;

    console.log(nextOffset)

    const data = await loadJobs(nextOffset, LIMIT, searchParams.title, searchParams.company);

    if (data.length < LIMIT) setHasMore(false);

    setJobs((prev) => [...prev, ...data]);
    setOffset(nextOffset);
    loadMoreRef.current = false;
  }

  const handleDelete = async () => {
    const confirm = window.confirm('Are you sure you want to delete this job?');
    if (confirm) {
      await deleteJobHandler(selectedJob.id);
      setJobs((prevJobs) => {
        // 1. Find index of deleted job
        const index = prevJobs.findIndex((job) => job.id === selectedJob.id);
        // 2. Create new job list
        const updated = prevJobs.filter((job) => job.id !== selectedJob.id);
        // 3. Pick new selected job (previous job or next job)
        let newSelected = updated[index - 1] || updated[index];
        // 4. Update selectedJob
        setSelectedJob(newSelected || null);
        return updated;
      });
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Search Bar */}
      <div className="px-7 my-6">
        <JobSearchBar onSearchClick={onSearchClick} tab="all" />
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
        {/* Left Job List */}
        <div className="w-1/3 border-r overflow-y-auto bg-white">
          <JobList jobs={jobs} onSelectJob={setSelectedJob} selectedJob={selectedJob} onLoadMore={loadMore} hasMore={hasMore} />
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
      </div>
    </div>
  )
}

export default JobContainer

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