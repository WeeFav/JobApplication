import React from "react";
import ScrollToTop from "../ScrollToTop";
import { NavLink, useNavigate } from "react-router-dom";

const JobDetails = ({ job }) => {
  const navigate = useNavigate();

  const handleDelete = async () => {

  }

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

      {/* Edit + Delete Buttons */}
      <div className="flex justify-end gap-3">
        <NavLink
          to={`/jobs/edit/${job.id}`}
          className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition"
        >
          Edit
        </NavLink>

        <button
          onClick={handleDelete}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
        >
          Delete
        </button>
      </div>
      
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
