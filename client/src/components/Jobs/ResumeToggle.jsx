import React from 'react'
import { useState, useEffect } from "react"

const ResumeToggle = () => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(1);

  useEffect(() => {
    setLoading(true);
    loadResumes(setResumes, setLoading, setActiveId);
  }, []);

  return (
    <>
      {loading ? <></> :
        <div className="flex gap-2">
          {resumes.map((resume) => (
            <button
              key={resume.id}
              onClick={() => setActiveId(resume.id)}
              className={`px-4 py-2 rounded border transition 
              ${activeId === resume.id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                  }
              `}
            >
              {resume.name}
            </button>
          ))}
        </div>
      }
    </>
  )
}

export default ResumeToggle

/* 
===============================================================================
API
===============================================================================
*/
const loadResumes = async (setResumes, setLoading, setActiveId) => {
  const res = await fetch('/api/resumes');
  const data = await res.json();
  setResumes(data);
  setActiveId(data[0].id);
  setLoading(false);
};