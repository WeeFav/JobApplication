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
      <div className="">
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
  );
};

export default JobListings;