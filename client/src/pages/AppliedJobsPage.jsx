import React from "react";
import JobContainer from "../components/Jobs/JobContainer";

const AppliedJobsPage = () => {
  return (
    <JobContainer fetchJobs={fetchJobs} tab="applied" />
  );
};

export default AppliedJobsPage;

/* 
===============================================================================
API
===============================================================================
*/

const fetchJobs = async ({ page = 1, limit = 25, jobTitle = '', company = '' } = {}) => {
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit)
  });

  if (jobTitle && jobTitle.trim()) {
    queryParams.append('jobTitle', jobTitle.trim());
  }
  if (company && company.trim()) {
    queryParams.append('company', company.trim());
  }

  const res = await fetch(`/server_api/applications?${queryParams.toString()}`);
  return await res.json();
};