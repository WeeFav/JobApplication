import React, { useState, useEffect, useRef } from "react";
import JobContainer from "../components/Jobs/JobContainer";

const AppliedJobsPage = () => {
  return (
    <JobContainer loadJobs={loadJobs} searchJobHandler={searchJobHandler}/>
  )
}

export default AppliedJobsPage

/* 
===============================================================================
API
===============================================================================
*/

// function to load company jobs
const loadJobs = async (setJobs, setLoading) => {
    const res = await fetch(`/api/applications`);
    const data = await res.json();
    setJobs(data);
    setLoading(false);
}

// function to search job
const searchJobHandler = async (jobTitle, company) => {
  const res = await fetch(`/api/applications?jobTitle=${jobTitle}&company=${company}`);
  const data = await res.json();
  return data;
}