import React, { useState, useEffect, useRef } from "react";
import JobContainer from "../components/Jobs/JobContainer";

const AppliedJobsPage = () => {
  return (
    <JobContainer loadJobs={loadJobs}/>
  )
}

export default AppliedJobsPage

/* 
===============================================================================
API
===============================================================================
*/

// function to load company jobs
const loadJobs = async (offset, limit, title, company) => {
  console.log(2)
  const params = new URLSearchParams({
    offset: offset,
    limit: limit,
    title: title,
    company: company
  });
  // const res = await fetch(`/server_api/applications?${params.toString()}`);
  // return await res.json();
}