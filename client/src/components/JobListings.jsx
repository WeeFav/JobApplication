import { useEffect, useState } from "react";
import JobListing from "./JobListing";

const JobListings = ({jobs, loading, isHome=false}) => {
  if (isHome && !loading) {
    jobs = jobs.slice(0, 3);
  }

  return (
      <div className="">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? <h2>Loading...</h2> :
            <>
              {jobs.map((job) => (
                <JobListing key={job.id} job={job} />
              ))}
            </>
          }
        </div>
      </div>
  );
};

export default JobListings;