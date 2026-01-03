import React, { useState, useEffect, useRef } from "react";
import JobContainer from "../components/Jobs/JobContainer";

const JobsPage = () => {
  return (
    <JobContainer loadJobs={loadJobs} searchJobHandler={searchJobHandler}/>
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
const loadJobs = async (loadingRef, hasMore, offset, LIMIT, setJobs, setLoading, setHasMore, setOffset) => {
  if (loadingRef.current || !hasMore) return;

  loadingRef.current = true; // lock
  setLoading(true);

  const date = getThirtyDaysAgo();
  const res = await fetch(`/server_api/jobs?date=${date}&limit=${LIMIT}&offset=${offset}`);
  const data = await res.json();

  setJobs(prev => [...prev, ...data]);
  setOffset(prev => prev + LIMIT);

  if (data.length < LIMIT) {
    setHasMore(false); // no more jobs in DB
  }

  loadingRef.current = false; // unlock
  setLoading(false);
}

// function to search job
const searchJobHandler = async (jobTitle, company) => {
  const date = getThirtyDaysAgo();
  const res = await fetch(`/server_api/jobs?date=${date}&jobTitle=${jobTitle}&company=${company}`);
  const data = await res.json();
  return data;
}