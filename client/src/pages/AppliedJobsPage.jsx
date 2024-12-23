import JobListings from "../components/JobListings"
import JobSearchBar from "../components/JobSearchBar"
import { useState, useContext } from "react"

const AppliedJobsPage = ({searchJobHandler}) => {
  let jobs;
  let loading;

  const unFiltered = useContext(JobsContext);
  const unfilteredJobs = unFiltered.jobs;
  const unfilteredJobsLoading = unFiltered.loading;

  const  [filteredJobs, setFilteredJobs]  = useState(null);
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
      <section className="mx-40">
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