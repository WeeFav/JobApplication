import React, { useState, useEffect, useRef } from "react";
import JobSearchBar from "./JobSearchBar";
import JobList from "./JobList";
import JobDetails from "./JobDetails";
import ResumeToggle from "./ResumeToggle";

const JobContainer = ({loadJobs, searchJobHandler, activeId=null, setActiveId=null}) => {
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
    activeId !== null ? loadJobs(setJobs, setLoading, activeId) : loadJobs(setJobs, setLoading);
  }, [activeId])

  const onSearchClick = async (jobTitle, company) => {
    setLoading(true);
    setJobs(await searchJobHandler(jobTitle, company));
    setLoading(false);
  }; 

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
      {loading ? <h2>Loading...</h2> :
        <>
        {/* Top Search Bar */}
        <div className="px-7 my-6">
          <JobSearchBar onSearchClick={onSearchClick} tab="all" />
        </div>

        {(activeId !== null && setActiveId) ? 
        <div className="flex items-center justify-center mb-3">
          <ResumeToggle activeId={activeId} setActiveId={setActiveId}/>
        </div>
        :
        <></>
        }

        {/* Main Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Job List */}
          <div className="w-1/3 border-r overflow-y-auto bg-white">
            <JobList jobs={jobs} onSelectJob={setSelectedJob} selectedJob={selectedJob} />
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
        </>
      }
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
  const res = await fetch(`http://localhost:8080/jobs?id=${id}`, {
    method: 'DELETE'
  });
};