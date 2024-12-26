import JobListings from "../components/Jobs/JobListings"
import JobSearchBar from "../components/Jobs/JobSearchBar"
import { useState, useContext, useEffect } from "react"
import { AccountContext } from "../App";

const CompanyJobsPage = () => {
  const accountContext = useContext(AccountContext);
  
  let jobs;
  let loading;

  const [unfilteredJobs, setUnfilteredJobs] = useState(null);
  const [unfilteredJobsLoading, setUnfilteredJobsLoading] = useState(true);

  useEffect(() => {
    loadCompanyJobs(accountContext.ID, setUnfilteredJobs, setUnfilteredJobsLoading);
  }, [])

  const [filteredJobs, setFilteredJobs] = useState(null);
  const [filteredJobsLoading, setFilteredJobsLoading] = useState(true);

  const onSearchClick = async (jobTitle, jobLocation, jobType) => {
    setFilteredJobs(await searchJobHandler(accountContext.ID, jobTitle, jobLocation, jobType));
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
  )
}

export default CompanyJobsPage

/* 
===============================================================================
API
===============================================================================
*/

// function to load company jobs
const loadCompanyJobs = async (company_id, setUnfilteredJobs, setUnfilteredJobsLoading) => {
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
const searchJobHandler = async (company_id, jobTitle, jobLocation, jobType) => {
  const res = await fetch(`/api/job?is_custom=0&company_id=${company_id}&jobTitle=${jobTitle}&jobLocation=${jobLocation}&jobType=${jobType}`);
  const data = await res.json();
  return data;
}