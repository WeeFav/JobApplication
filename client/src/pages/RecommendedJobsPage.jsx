import React, { useState, useEffect, useRef } from "react";
import JobContainer from "../components/Jobs/JobContainer";

const RecommendedJobsPage = () => {
  const [activeId, setActiveId] = useState(0);

  return (
    <JobContainer loadJobs={loadJobs} searchJobHandler={searchJobHandler} activeId={activeId} setActiveId={setActiveId} tab="rec"/>
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
  const res = await fetch(`/server_api/recommendations?date=${date}&resumeId=${activeId}&score=0.5`);
  const data = await res.json();
  setJobs(data);
  setLoading(false);
}

// function to search job
const searchJobHandler = async (jobTitle, company, activeId, score) => {
  const date = getThirtyDaysAgo();
  const minScore = score ? (parseFloat(score) / 100) : 0.5;
  const res = await fetch(`/server_api/recommendations?date=${date}&resumeId=${activeId}&jobTitle=${jobTitle}&company=${company}&score=${minScore}`);
  const data = await res.json();
  return data;
}