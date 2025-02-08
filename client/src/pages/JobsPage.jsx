import JobListings from "../components/Jobs/JobListings"
import JobSearchBar from "../components/Jobs/JobSearchBar"
import { useState, useContext, useEffect } from "react"
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { AccountContext } from "../App";

const JobsPage = () => {
  const accountContext = useContext(AccountContext);
  
  const [tab, setTab] = useState('all')

  const [jobs, setJobs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    loadJobs(setJobs, setLoading, tab, accountContext.ID);
  }, [tab])

  const onSearchClick = async (jobTitle, jobLocation, jobType) => {
    setLoading(true);
    setJobs(await searchJobHandler(jobTitle, jobLocation, jobType, tab, accountContext.ID));
    setLoading(false);
  };

  return (
    <>
      <section className="mx-40 mb-12 flex-grow">
        <div className="my-12 flex justify-center">
          <button className={`text-3xl font-bold text-center ${tab === 'all' ? 'bg-website-gold text-white' : 'bg-white text-website-darkGray'} hover:bg-website-darkGold hover:text-white rounded p-3 mr-6`}
            onClick={() => {setTab("all")}}
          >
            All Jobs
          </button>
          <button className={`text-3xl font-bold text-center ${tab === 'rec' ? 'bg-website-gold text-white' : 'bg-white text-website-darkGray'} hover:bg-website-darkGold hover:text-white rounded p-3`}
            onClick={() => {setTab("rec")}}
          >
            Recommended Jobs
          </button>
        </div>
        <div className="px-7">
          <JobSearchBar onSearchClick={onSearchClick} tab={tab} />
        </div>
        <div className="mt-10">
          <JobListings jobs={jobs} loading={loading} />
        </div>
      </section>
    </>
  )
}

export default JobsPage

/* 
===============================================================================
API
===============================================================================
*/

// function to load company jobs
const loadJobs = async (setJobs, setLoading, tab, user_id) => {
  try {
    let res;

    if (tab === 'all') {
      res = await fetch(`/api/job?is_custom=0`);
    }
    else if (tab === 'rec') {
      res = await fetch(`/api/recommend?user_id=${user_id}`);
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
const searchJobHandler = async (jobTitle, jobLocation, jobType, tab, user_id) => {
  let res;

  if (tab === 'all') {
    res = await fetch(`/api/job?is_custom=0&jobTitle=${jobTitle}&jobLocation=${jobLocation}&jobType=${jobType}`);
  }
  else if (tab === 'rec') {
    res = await fetch(`/api/recommend?user_id=${user_id}&jobTitle=${jobTitle}&jobLocation=${jobLocation}&jobType=${jobType}`);
  }

  const data = await res.json();
  return data;
}