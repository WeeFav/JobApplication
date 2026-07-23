import React, { useState, useEffect } from "react";
import ScrollToTop from "../ScrollToTop";
import { NavLink, useNavigate } from "react-router-dom";

const findSkillMatches = (text, skills) => {
  if (!text || !skills || skills.length === 0) return [];
  
  // Sort skills by length descending to match longest first
  const sortedSkills = [...skills]
    .filter(s => s && s.trim().length > 0)
    .sort((a, b) => b.length - a.length);
    
  const matches = [];
  const lowerText = text.toLowerCase();
  
  for (const skill of sortedSkills) {
    const lowerSkill = skill.toLowerCase();
    let index = lowerText.indexOf(lowerSkill);
    
    while (index !== -1) {
      const end = index + skill.length;
      
      // Boundary check: preceding and following characters should not be alphanumeric
      const precedingChar = index > 0 ? text[index - 1] : '';
      const followingChar = end < text.length ? text[end] : '';
      
      const isPrecedingBoundary = !/[a-zA-Z0-9]/.test(precedingChar);
      const isFollowingBoundary = !/[a-zA-Z0-9]/.test(followingChar);
      
      if (isPrecedingBoundary && isFollowingBoundary) {
        // Check overlap with existing matches
        const hasOverlap = matches.some(m => 
          (index >= m.start && index < m.end) || 
          (end > m.start && end <= m.end) || 
          (index <= m.start && end >= m.end)
        );
        
        if (!hasOverlap) {
          matches.push({
            start: index,
            end: end,
            skill: skill,
            matchedText: text.substring(index, end)
          });
        }
      }
      
      index = lowerText.indexOf(lowerSkill, index + 1);
    }
  }
  
  // Sort matches by start index ascending
  return matches.sort((a, b) => a.start - b.start);
};

const renderHighlightedContent = (text, matches) => {
  if (!text) return "";
  if (!matches || matches.length === 0) return text;
  
  const elements = [];
  let lastIndex = 0;
  
  matches.forEach((match, idx) => {
    // Add text before the match
    if (match.start > lastIndex) {
      elements.push(text.substring(lastIndex, match.start));
    }
    
    // Add the highlighted match
    elements.push(
      <span
        key={`match-${idx}`}
        className="inline-block border border-website-gold bg-amber-50 text-website-darkGold px-1 rounded mx-0.5 font-semibold shadow-sm hover:bg-amber-100 transition-colors"
        title={`Skill: ${match.skill}`}
      >
        {match.matchedText}
      </span>
    );
    
    lastIndex = match.end;
  });
  
  // Add remaining text
  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }
  
  return elements;
};

const JobDetails = ({ job, handleDelete }) => {
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
      <div className="flex flex-wrap gap-4 items-center text-sm text-gray-500 mb-4">
        <p>{job.location}</p>
        <p> Posted: {formatDate(job.post_date)}</p>
        <p> Scraped: {formatDate(job.scrape_date)}</p>
        <p> Applied: {formatDate(job.application_date)}</p>
        <p> Job ID: {job.id}</p>
        {(job.source || job.method) && (
          <div className="flex gap-2 ml-auto">
            {job.source && (
              <span className="bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                {job.source}
              </span>
            )}
            {job.method && (
              <span className="bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                {job.method}
              </span>
            )}
          </div>
        )}
      </div>

      <hr className="mb-4" />

      {/* Description */}
      <p className="text-gray-800 leading-relaxed mb-6 whitespace-pre-line">
        {job.description_extracted ? (
          renderHighlightedContent(
            job.description_extracted,
            findSkillMatches(job.description_extracted, job.raw_skills || [])
          )
        ) : (
          "No description available."
        )}
      </p>

      {/* Edit + Delete Buttons */}
      <div className="flex justify-end gap-3">
        {/* <NavLink
          to={`/jobs/edit/${job.id}`}
          className="bg-website-blue text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition"
        >
          Edit
        </NavLink> */}

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
  const res = await fetch(`/server_api/applications?job_id=${id}`);
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
  const res = await fetch(`/python_api/applications?id=${id}`, {
    method: 'DELETE'
  });
};

const addAppliedJob = async (id) => {
  const res = await fetch('/python_api/applications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ id: id })
  });
}