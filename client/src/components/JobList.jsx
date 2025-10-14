import React from "react";
import Pagination from '@mui/material/Pagination';

const JobList = ({ jobs, onSelectJob, selectedJob }) => {
  return (
    <div className="divide-y">
      {jobs.map((job) => (
        <div
          key={job.id}
          onClick={() => onSelectJob(job)}
          className={`p-4 cursor-pointer hover:bg-blue-50 ${selectedJob?.id === job.id ? "bg-blue-100" : ""
            }`}
        >
          <h3 className="text-lg font-semibold">{job.title}</h3>
          <p className="text-sm text-gray-600">{job.company}</p>
          <p className="text-sm text-gray-500">{job.location}</p>
        </div>
      ))}

      {jobs.length === 0 && (
        <div className="p-4 text-gray-500 text-center">No jobs found</div>
      )}
    </div>
  )
}

export default JobList

