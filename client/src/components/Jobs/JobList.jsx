import React from "react";
import Pagination from '@mui/material/Pagination';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';
import CircularProgress from '@mui/material/CircularProgress';

const JobList = ({ jobs, hasMore, loaderRef, onSelectJob, selectedJob }) => {
  return (
    <div className="divide-y">
      {jobs.length === 0 && (<div className="p-4 text-gray-500 text-center">No jobs found</div>)}
      
      {jobs.map((job) => (
        <div
          key={job.id}
          onClick={() => onSelectJob(job)}
          className={`p-4 cursor-pointer hover:bg-blue-50 ${selectedJob?.id === job.id ? "bg-blue-100" : ""
            }`}
        >
          <div className="flex justify-between">
            <div>
              <h3 className="text-lg font-semibold">{job.title}</h3>
              <p className="text-sm text-gray-600">{job.company}</p>
            </div>
            {job.final_score ? <Gauge width={70} height={70} value={Math.ceil(job.final_score * 100)} cornerRadius="50%" sx={(theme) => ({[`& .${gaugeClasses.valueArc}`]: {fill: '#bc9631',}})}/> : <></> }
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>{job.location}</span>
            {job.post_date && <span>{timeAgo(job.post_date)}</span>}
          </div>
        </div>
      ))}

      {hasMore && 
      <div ref={loaderRef} className='flex justify-center item-center py-5'>
        <CircularProgress size="20px" color="white"/>
      </div>
      }
    </div>
  )
}

const timeAgo = (date) => {
  const now = new Date();
  const posted = new Date(date);
  const diffMs = now - posted;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  if (diffHr > 0) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
  if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  return "just now";
};

export default JobList

