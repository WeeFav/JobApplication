import React, { useState } from "react";
import JobSearchBar from "../components/Jobs/JobSearchBar"
import JobList from "../components/JobList";
import JobDetails from "../components/JobDetails";

const mockJobs = [
  {
    id: 1,
    title: "Software Engineer",
    company: "TechCorp",
    location: "San Francisco, CA",
    description:
      "Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred. Work on backend systems and APIs to power our platform. Experience with Node.js and AWS preferred.",
  },
  {
    id: 2,
    title: "Machine Learning Intern",
    company: "AI Labs",
    location: "Boston, MA",
    description:
      "Assist in developing ML models for computer vision. Python and TensorFlow experience required.",
  },
  {
    id: 3,
    title: "Frontend Developer",
    company: "Webify",
    location: "Remote",
    description:
      "Build modern UIs with React and Tailwind CSS. Focus on performance and accessibility.",
  },
  {
    id: 4,
    title: "Frontend Developer",
    company: "Webify",
    location: "Remote",
    description:
      "Build modern UIs with React and Tailwind CSS. Focus on performance and accessibility.",
  },
  {
    id: 5,
    title: "Frontend Developer",
    company: "Webify",
    location: "Remote",
    description:
      "Build modern UIs with React and Tailwind CSS. Focus on performance and accessibility.",
  },
  {
    id: 6,
    title: "Frontend Developer",
    company: "Webify",
    location: "Remote",
    description:
      "Build modern UIs with React and Tailwind CSS. Focus on performance and accessibility.",
  },
  {
    id: 7,
    title: "Frontend Developer",
    company: "Webify",
    location: "Remote",
    description:
      "Build modern UIs with React and Tailwind CSS. Focus on performance and accessibility.",
  },
  {
    id: 8,
    title: "Frontend Developer",
    company: "Webify",
    location: "Remote",
    description:
      "Build modern UIs with React and Tailwind CSS. Focus on performance and accessibility.",
  },
  {
    id: 9,
    title: "Frontend Developer",
    company: "Webify",
    location: "Remote",
    description:
      "Build modern UIs with React and Tailwind CSS. Focus on performance and accessibility.",
  },
  {
    id: 10,
    title: "Frontend Developer",
    company: "Webify",
    location: "Remote",
    description:
      "Build modern UIs with React and Tailwind CSS. Focus on performance and accessibility.",
  },
];

const JobsPage = () => {
  const [tab, setTab] = useState('all')
  const [jobs, setJobs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const filteredJobs = mockJobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onSearchClick = async (jobTitle, company, score) => {
    setLoading(true);
    setJobs(await searchJobHandler(jobTitle, company, score, tab));
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Search Bar */}
      <div className="px-7 my-6">
        <JobSearchBar onSearchClick={onSearchClick} tab={tab} />
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Job List */}
        <div className="w-1/3 border-r overflow-y-auto bg-white">
          <JobList jobs={filteredJobs} onSelectJob={setSelectedJob} selectedJob={selectedJob} />
        </div>

        {/* Right Job Details */}
        <div className="flex-1 overflow-y-auto bg-gray-100">
          {selectedJob ? (
            <JobDetails job={selectedJob} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a job to view details
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default JobsPage

/* 
===============================================================================
API
===============================================================================
*/

// function to load company jobs
const loadJobs = async (setJobs, setLoading, tab) => {
  try {
    let res;

    if (tab === 'all') {
      res = await fetch(`/api/jobs`);
    }
    else if (tab === 'rec') {
      res = await fetch(`/api/recommendations`);
    }

    const data = await res.json();
    setJobs(data);
  } catch (error) {
    console.log("Error fetching data from backend", error);
  } finally {
    setLoading(false);
  }
}

// function to search job
const searchJobHandler = async (jobTitle, company, score, tab) => {
  let res;

  if (tab === 'all') {
    res = await fetch(`/api/jobs?jobTitle=${jobTitle}&company=${company}`);
  }
  else if (tab === 'rec') {
    res = await fetch(`/api/recommendations?jobTitle=${jobTitle}&company=${company}&score=${score}`);
  }

  const data = await res.json();
  return data;
}