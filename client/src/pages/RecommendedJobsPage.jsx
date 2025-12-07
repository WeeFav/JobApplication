import React, { useState, useEffect, useRef } from "react";
import JobContainer from "../components/Jobs/JobContainer";

const RecommendedJobsPage = () => {
  const [activeId, setActiveId] = useState(0);

  return (
    <JobContainer loadJobs={loadJobs} searchJobHandler={searchJobHandler} activeId={activeId} setActiveId={setActiveId}/>
  )
}

export default RecommendedJobsPage

/* 
===============================================================================
API
===============================================================================
*/
const getThirtyDaysAgo = () => {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const formatted = thirtyDaysAgo.toISOString().split('T')[0];
  return formatted
}

const loadJobs = async (setJobs, setLoading, activeId) => {
  const date = getThirtyDaysAgo();
  const res = await fetch(`/api/recommendations?date=${date}&resumeId=${activeId}`);
  const data = await res.json();
  setJobs(data);
  setLoading(false);
}

// function to search job
const searchJobHandler = async (jobTitle, company, activeId) => {
  const date = getThirtyDaysAgo();
  const res = await fetch(`/api/recommendations?date=${date}&resumeId=${activeId}&jobTitle=${jobTitle}&company=${company}`);
  const data = await res.json();
  return data;
}