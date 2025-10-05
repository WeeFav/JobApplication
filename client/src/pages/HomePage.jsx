import Hero from "../components/Home/Hero"
import JobListings from "../components/Jobs/JobListings";
import { useState, useEffect } from "react"

const HomePage = () => {
  const [jobs, setJobs] = useState();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs(setJobs, setLoading);
  }, []);

  return (
    <div className="flex-grow">
      <section className="mb-8">
        <Hero />
      </section>
      <section className="flex flex-col gap-8 mx-40">
        <div>
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-website-darkGray text-center">
              Recently Applied Jobs
            </h2>
            <div className="mt-10">
              <JobListings jobs={jobs} loading={loading} isHome={true} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;

/* 
===============================================================================
API
===============================================================================
*/

// function to load applied jobs
const loadJobs = async (setJobs, setLoading) => {
  try {
    let res = await fetch(`/api/applications?limit=3`);
    const data = await res.json();
    setJobs(data);
  } catch (error) {
    console.log("Error fetching data from backend", error);
  } finally {
    setLoading(false);
  }
}