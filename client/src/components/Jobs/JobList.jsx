import React from "react";
import Pagination from '@mui/material/Pagination';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';

const JobList = ({ jobs, onSelectJob, selectedJob }) => {
  return (
    <div className="relative">
      <div className="sticky top-0 bg-gray-50 border-b px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider z-10">
        {jobs ? jobs.length : 0} {jobs?.length === 1 ? 'result' : 'results'} found
      </div>
      <div className="divide-y">
        {jobs && jobs.map((job) => (
          <div
            key={job.id}
            onClick={() => onSelectJob(job)}
            className={`p-4 cursor-pointer hover:bg-blue-50 ${selectedJob?.id === job.id ? "bg-blue-100" : ""
              }`}
          >
            <div className="flex justify-between items-center mb-1">
              <div className="flex-grow min-w-0 pr-2">
                <h3 className="text-lg font-semibold truncate" title={job.title}>{job.title}</h3>
                <p className="text-sm text-gray-600 truncate" title={job.company}>{job.company}</p>
              </div>
              {job.final_score ? (
                <div className="w-[70px] h-[70px] flex-shrink-0 flex items-center justify-center">
                  <Gauge 
                    width={70} 
                    height={70} 
                    value={Math.ceil(job.final_score * 100)} 
                    cornerRadius="50%" 
                    sx={(theme) => ({
                      [`& .${gaugeClasses.valueArc}`]: {
                        fill: '#bc9631',
                      },
                    })}
                  />
                </div>
              ) : <></>}
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>{job.location}</span>
              {job.post_date && <span>{timeAgo(job.post_date)}</span>}
            </div>
          </div>
        ))}

        {(!jobs || jobs.length === 0) && (
          <div className="p-4 text-gray-500 text-center">No jobs found</div>
        )}
      </div>
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

