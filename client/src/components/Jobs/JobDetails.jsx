import React from "react";

const JobDetails = ({ job }) => {
  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h2 className="text-2xl font-semibold mb-1">{job.title}</h2>
          <p className="text-gray-700">{job.company}</p>
        </div>

        {/* Apply Button */}
        {job.url && (
          <button
            onClick={() => window.open(job.url, "_blank")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Apply Now
          </button>
        )}
      </div>

      {/* Location + Dates */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
        <p>{job.location}</p>
        <p> Posted: {formatDate(job.post_date)}</p>
        <p> Scraped: {formatDate(job.scrape_date)}</p>
      </div>  

      <hr className="mb-4" />

      {/* Description */}
      <p className="text-gray-800 leading-relaxed mb-6 whitespace-pre-line">
        {job.description_extracted || "No description available."}
      </p>

    </div>
  );
}

const formatDate = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default JobDetails
