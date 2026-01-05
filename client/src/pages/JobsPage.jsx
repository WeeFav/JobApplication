import React, { useState, useEffect, useRef } from "react";
import JobContainer from "../components/Jobs/JobContainer";

const JobsPage = () => {
  return (
    <JobContainer loadJobs={loadJobs}/>
  )
}

export default JobsPage

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

// function to load company jobs
const loadJobs = async (loadingRef, hasMoreRef, offsetRef, LIMIT, setJobs, searchFilter) => {
  if (loadingRef.current || !hasMoreRef.current) return;
  
  loadingRef.current = true; // lock

  const date = getThirtyDaysAgo();
  const params = new URLSearchParams({
    date: date,
    limit: LIMIT,
    offset: offsetRef.current,
    title: searchFilter.title,
    company: searchFilter.company  
  });

  const res = await fetch(`/server_api/jobs?${params.toString()}`);
  const data = await res.json();

  setJobs(prev => [...prev, ...data]);
  offsetRef.current = offsetRef.current + LIMIT;

  if (data.length < LIMIT) {
    hasMoreRef.current = false; // no more jobs in DB
  }

  loadingRef.current = false; // unlock
}