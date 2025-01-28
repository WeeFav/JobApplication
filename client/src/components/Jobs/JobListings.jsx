import { useEffect, useState } from "react";
import JobListing from "./JobListing";
import Pagination from '@mui/material/Pagination';

const JobListings = ({ jobs, loading, isHome = false }) => {
  // pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 15;
  let currentJobs;


  if (!loading) {
    currentJobs = jobs.slice((page - 1) * itemsPerPage, (page - 1) * itemsPerPage + itemsPerPage)
  }

  return (
    <div className="">
      {loading ? <h2>Loading...</h2> :
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <>
              {currentJobs.map((job) => (
                <JobListing key={job.job_id} job={job} />
              ))}
            </>
          </div>

          {isHome ? <></> :
            <div className="mt-10 flex justify-center">
              <Pagination count={Math.ceil(jobs.length / itemsPerPage)} color="primary" page={page} size="large"
                onChange={(event, value) => {
                  setPage(value);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }} />
            </div>
          }
        </div>
      }
    </div>
  );
};

export default JobListings;