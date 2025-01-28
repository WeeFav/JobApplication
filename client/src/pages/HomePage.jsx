import Hero from "../components/Home/Hero"
import JobListings from "../components/Jobs/JobListings";
import { useState, useContext, useEffect } from "react"
import { AccountContext } from "../App";

const HomePage = () => {
  const accountContext = useContext(AccountContext);
  
  const [jobs, setJobs] = useState();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs(accountContext.ID, setJobs, setLoading, accountContext.isCompany);
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
              {!accountContext.isCompany ? 'Recently Applied Jobs' : 'Recently Posted Jobs'}
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
const loadJobs = async (id, setJobs, setLoading, is_company) => {
  try {
    let res;
    if (!is_company) {
      res = await fetch(`/api/application?user_id=${id}&limit=3`);
    }
    else {
      res = await fetch(`/api/job?is_custom=0&company_id=${id}&limit=3`);
    }
    const data = await res.json();
    setJobs(data);
  } catch (error) {
    console.log("Error fetching data from backend", error);
  } finally {
    setLoading(false);
  }
}