import JobListings from "../components/Jobs/JobListings"
import JobSearchBar from "../components/Jobs/JobSearchBar"
import { useState, useContext, useEffect } from "react"
import { AccountContext } from "../App";

const AppliedJobsPage = () => {
  const accountContext = useContext(AccountContext);
  
  let jobs;
  let loading;

  const [unfilteredApplications, setUnfilteredApplications] = useState(null);
  const [unfilteredApplicationsLoading, setUnfilteredApplicationsLoading] = useState(true);

  useEffect(() => {
    loadApplications(accountContext.ID, setUnfilteredApplications, setUnfilteredApplicationsLoading);
  }, [])

  const  [filteredApplications, setFilteredApplications]  = useState(null);
  const [filteredApplicationsLoading, setFilteredApplicationsLoading] = useState(true);

  const onSearchClick = async (jobTitle, jobLocation, jobType) => {
    setFilteredApplications(await searchApplicationHandler(accountContext.ID, jobTitle, jobLocation, jobType));
    setFilteredApplicationsLoading(false);
  };

  if (!filteredApplicationsLoading) {
    jobs = filteredApplications;
  }
  else {
    jobs = unfilteredApplications;
    loading = unfilteredApplicationsLoading;
  }
  
  return (
    <>
      <section className="mx-40 mb-12 flex-grow">
        <div className="my-12">
          <h2 className="text-3xl font-bold text-website-darkGray text-center">
            Applied Jobs
          </h2>
        </div>
        <div className="px-7">
          <JobSearchBar onSearchClick={onSearchClick}/>
        </div>
        <div className="mt-10">
          <JobListings jobs={jobs} loading={loading}/>
        </div>
      </section>
    </>
  )
}

export default AppliedJobsPage

/* 
===============================================================================
API
===============================================================================
*/

// function to load user application
const loadApplications = async (user_id, setUnfilteredApplications, setUnfilteredApplicationsLoading) => {
  try {
    const res = await fetch(`/api/application?user_id=${user_id}`);
    const data = await res.json();
    setUnfilteredApplications(data);
  } catch (error) {
    console.log("Error fetching data from backend", error);
  } finally {
    setUnfilteredApplicationsLoading(false);
  }
}

// function to search job
const searchApplicationHandler = async (user_id, jobTitle, jobLocation, jobType) => {
  const res = await fetch(`/api/application?user_id=${user_id}&jobTitle=${jobTitle}&jobLocation=${jobLocation}&jobType=${jobType}`);
  const data = await res.json();
  return data;
}