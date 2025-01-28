import JobSearchBar from '../Jobs/JobSearchBar'
import JobListings from '../Jobs/JobListings'
import { useState, useContext, useEffect } from "react"
import { useParams } from "react-router-dom";

const AllJobsTab = ({ companyName }) => {
  let jobs;
  let loading;

  const { id } = useParams();

  const [unfilteredJobs, setUnfilteredJobs] = useState(null);
  const [unfilteredJobsLoading, setUnfilteredJobsLoading] = useState(true);

  useEffect(() => {
    loadJobs(id, setUnfilteredJobs, setUnfilteredJobsLoading);
  }, [])

  const [filteredJobs, setFilteredJobs] = useState(null);
  const [filteredJobsLoading, setFilteredJobsLoading] = useState(true);

  const onSearchClick = async (jobTitle, jobLocation, jobType,) => {
    setFilteredJobs(await searchJobHandler(jobTitle, jobLocation, jobType, id));
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
            All Jobs From {companyName}
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
  )
}

export default AllJobsTab

/* 
===============================================================================
API
===============================================================================
*/

// function to load all company jobs
const loadJobs = async (company_id, setUnfilteredJobs, setUnfilteredJobsLoading) => {
  try {
    const res = await fetch(`/api/job?is_custom=0&company_id=${company_id}`);
    const data = await res.json();
    setUnfilteredJobs(data);
  } catch (error) {
    console.log("Error fetching data from backend", error);
  } finally {
    setUnfilteredJobsLoading(false);
  }
}

// function to search job
const searchJobHandler = async (jobTitle, jobLocation, jobType, company_id) => {
  const res = await fetch(`/api/job?is_custom=0&company_id=${company_id}&jobTitle=${jobTitle}&jobLocation=${jobLocation}&jobType=${jobType}`);
  const data = await res.json();
  return data;
}