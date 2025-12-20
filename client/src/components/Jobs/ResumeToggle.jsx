import React from 'react'
import { useState, useEffect } from "react"

const ResumeToggle = ({activeId, setActiveId}) => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    loadResumes(setResumes, setLoading);
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
                    ? "bg-website-gold text-white "
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
const loadResumes = async (setResumes, setLoading) => {
  const res = await fetch('/server_api/resumes');
  const data = await res.json();
  setResumes(data);
  setLoading(false);
};