import React from "react";

export default function JobDetails({ job }) {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-2">{job.title}</h2>
      <p className="text-gray-700 mb-1">{job.company}</p>
      <p className="text-gray-500 mb-4">{job.location}</p>
      <hr className="mb-4" />
      <p className="text-gray-800 leading-relaxed">{job.description_extracted}</p>
    </div>
  );
}
