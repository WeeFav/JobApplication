import React, { useState, useEffect } from "react";
import ScrollToTop from "../ScrollToTop";
import { NavLink, useNavigate } from "react-router-dom";

const JobDetails = ({ job }) => {
  const [applied, setApplied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    loadApplication(job.id, setApplied, setLoading);
  }, [job]);

  const removeAppliedJobHandler = async () => {
    await removeAppliedJob(job.id);
    setApplied(false);
  }

  const addAppliedJobHandler = async () => {
    await addAppliedJob(job.id);
    setApplied(true);
  }

  const handleDelete = async () => {
    const confirm = window.confirm('Are you sure you want to delete this job?');

    if (confirm) {
      await deleteJobHandler(job.id);
    }
  }

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h2 className="text-2xl font-semibold mb-1">{job.title}</h2>
          <p className="text-gray-700">{job.company}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* Apply Button */}
          {job.url && (
            <button
              onClick={() => window.open(job.url, "_blank")}
              className="bg-website-blue text-white px-4 py-2 rounded-lg"
            >
              Apply Now
            </button>
          )}

          {/* Toggle Applied Button */}
          <button
            onClick={() =>
              applied
                ? removeAppliedJobHandler()
                : addAppliedJobHandler()
            }
            className={`px-4 py-2 rounded-lg transition ${
              applied
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-green-500 text-white hover:bg-green-600"
            }`}
          >
            {applied ? "Remove from Applied" : "Mark as Applied"}
          </button>
        </div>
      </div>

      {/* Location + Dates */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
        <p>{job.location}</p>
        <p> Posted: {formatDate(job.post_date)}</p>
        <p> Scraped: {formatDate(job.scrape_date)}</p>
        <p> Applied: {formatDate(job.application_date)}</p>
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
          className="bg-website-blue text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition"
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

/* 
===============================================================================
API
===============================================================================
*/

const loadApplication = async (id, setApplied, setLoading) => {
  const res = await fetch(`/api/applications?job_id=${id}`);
  const data = await res.json();
  if (!data || data.length === 0) {
    setApplied(false);
  }
  else {
    setApplied(true);
  }
  setLoading(false);
};

const removeAppliedJob = async (id) => {
  const res = await fetch(`/api/applications?id=${id}`, {
    method: 'DELETE'
  });
};

const addAppliedJob = async (id) => {
  const res = await fetch('/api/applications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ job_id: id })
  });
}

const deleteJobHandler = async (id) => {
  const res = await fetch(`/api/jobs?id=${id}`, {
    method: 'DELETE'
  });
};