import React from "react";
import JobContainer from "../components/Jobs/JobContainer";

const JobsPage = () => {
  return (
    <JobContainer fetchJobs={fetchJobs} tab="all" />
  );
};

export default JobsPage;

/* 
===============================================================================
API
===============================================================================
*/

const getThirtyDaysAgo = () => {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  return thirtyDaysAgo.toISOString().split('T')[0];
};

const fetchJobs = async ({ page = 1, limit = 25, jobTitle = '', company = '' } = {}) => {
  const date = getThirtyDaysAgo();
  const queryParams = new URLSearchParams({
    date,
    page: String(page),
    limit: String(limit)
  });

  if (jobTitle && jobTitle.trim()) {
    queryParams.append('jobTitle', jobTitle.trim());
  }
  if (company && company.trim()) {
    queryParams.append('company', company.trim());
  }

  const res = await fetch(`/server_api/jobs?${queryParams.toString()}`);
  return await res.json();
};