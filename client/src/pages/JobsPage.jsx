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
const loadJobs = async (offset, limit, title, company) => {
  console.log(1)
  const date = getThirtyDaysAgo();
  const params = new URLSearchParams({
    date: date,
    offset: offset,
    limit: limit,
    title: title,
    company: company  
  });
  const res = await fetch(`/server_api/jobs?${params.toString()}`);
  return await res.json();
}