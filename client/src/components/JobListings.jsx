import { useEffect, useState } from "react";
import JobListing from "./JobListing";

const JobListings = ({ isHome = false }) => {
  const [backendData, setBackendData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const apiUrl = isHome ? "/api/jobs?_limit=3" : "/api/jobs";
      try {
        const res = await fetch(apiUrl);
        const data = await res.json();
        setBackendData(data);
      }
      catch (error) {
        console.log('Error fetching data from backend', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [])

  return (
    <section className="px-4 py-10 mx-40 mb-5">
      <div className="container-xl lg:container m-auto">
        <h2 className="text-3xl font-bold text-website-darkGray mb-6 text-center">
          {isHome ? "Recent Jobs" : "Browse Jobs"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? <h2>Loading...</h2> :
            <>
              {backendData.map((job) => (
                <JobListing key={job.id} job={job} />
              ))}
            </>
          }
        </div>
      </div>
    </section>
  );
};

export default JobListings;