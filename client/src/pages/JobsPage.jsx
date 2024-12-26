import JobListings from "../components/Jobs/JobListings"
import JobSearchBar from "../components/Jobs/JobSearchBar"
import { useState, useContext, useEffect } from "react"

const JobsPage = () => {  
  let jobs;
  let loading;

  const [unfilteredJobs, setUnfilteredJobs] = useState(null);
  const [unfilteredJobsLoading, setUnfilteredJobsLoading] = useState(true);

  useEffect(() => {
    loadJobs(setUnfilteredJobs, setUnfilteredJobsLoading);
  }, [])

  const [filteredJobs, setFilteredJobs] = useState(null);
  const [filteredJobsLoading, setFilteredJobsLoading] = useState(true);

  const onSearchClick = async (jobTitle, jobLocation, jobType) => {
    setFilteredJobs(await searchJobHandler(jobTitle, jobLocation, jobType));
    setFilteredJobsLoading(false);
  };

  if (!filteredJobsLoading) {
    jobs = filteredJobs;
  }
  else {
    jobs = unfilteredJobs;
    loading = unfilteredJobsLoading;
  }

  return (
    <>
      <section className="mx-40 mb-12 flex-grow">
        <div className="my-12">
          <h2 className="text-3xl font-bold text-website-darkGray text-center">
            Company Jobs
          </h2>
        </div>
        <div className="px-7">
          <JobSearchBar onSearchClick={onSearchClick} />
        </div>
        <div className="mt-10">
          <JobListings jobs={jobs} loading={loading} />
        </div>
      </section>
    </>
  )}

export default JobsPage

/* 
===============================================================================
API
===============================================================================
*/

// function to load company jobs
const loadJobs = async (setUnfilteredJobs, setUnfilteredJobsLoading) => {
  try {
    const res = await fetch(`/api/job?is_custom=0`);
    const data = await res.json();
    setUnfilteredJobs(data);
  } catch (error) {
    console.log("Error fetching data from backend", error);
  } finally {
    setUnfilteredJobsLoading(false);
  }
}

// function to search job
const searchJobHandler = async (jobTitle, jobLocation, jobType) => {
  const res = await fetch(`/api/job?is_custom=0&jobTitle=${jobTitle}&jobLocation=${jobLocation}&jobType=${jobType}`);
  const data = await res.json();
  return data;
}