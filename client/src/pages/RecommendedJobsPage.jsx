import React, { useState } from "react";
import JobContainer from "../components/Jobs/JobContainer";

const RecommendedJobsPage = () => {
  const [activeId, setActiveId] = useState(0);

  return (
    <JobContainer 
      fetchJobs={fetchJobs} 
      activeId={activeId} 
      setActiveId={setActiveId} 
      tab="rec" 
    />
  );
};

export default RecommendedJobsPage;

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

const fetchJobs = async ({ page = 1, limit = 25, activeId = 0, jobTitle = '', company = '', score = '' } = {}) => {
  const date = getThirtyDaysAgo();
  const minScore = score ? (parseFloat(score) / 100) : 0.5;
  const queryParams = new URLSearchParams({
    date,
    resumeId: String(activeId),
    score: String(minScore),
    page: String(page),
    limit: String(limit)
  });

  if (jobTitle && jobTitle.trim()) {
    queryParams.append('jobTitle', jobTitle.trim());
  }
  if (company && company.trim()) {
    queryParams.append('company', company.trim());
  }

  const res = await fetch(`/server_api/recommendations?${queryParams.toString()}`);
  return await res.json();
};