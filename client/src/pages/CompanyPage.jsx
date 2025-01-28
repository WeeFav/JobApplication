import { useState } from "react";
import AllJobsTab from "../components/Companies/AllJobsTab";
import AppliedJobsTab from "../components/Companies/AppliedJobsTab";
import { useEffect } from "react";
import { useParams } from "react-router-dom";

const CompanyPage = () => {
  const { id } = useParams();

  const [tab, setTab] = useState('Recommended Jobs')
  const selectedTab = "bg-website-gold text-white"

  const [companyName, setCompanyName] = useState();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanyName(id, setCompanyName, setLoading);
  }, [])

  const renderContent = () => {
    switch (tab) {
      case 'Recommended Jobs':
        return <></>;
      case 'Applied Jobs':
        return <AppliedJobsTab />;
      case 'All Jobs':
        return <AllJobsTab companyName={companyName} />;
      default:
        return <div>Select a tab to view content</div>;
    }
  };

  return (
    <div className="flex flex-grow gap-6">
      {loading ? <h1>Loading...</h1> :
        <>
          {/* Sidebar */}
          <div className="w-64 bg-website-blue text-gray-200">
            {/* <div className="p-5 text-2xl font-bold text-center text-gray-100">GoJobs</div> */}
            <nav className="mt-6 space-y-4">
              <button className={`w-full py-2 font-medium ${tab === 'Recommended Jobs' ? selectedTab : "text-gray-500"}`}
                onClick={() => { setTab('Recommended Jobs') }}
              >
                Recommended Jobs
              </button>
              <button className={`w-full py-2 font-medium ${tab === 'Applied Jobs' ? selectedTab : "text-gray-500"}`}
                onClick={() => { setTab('Applied Jobs') }}
              >
                Applied Jobs
              </button>
              <button className={`w-full py-2 font-medium ${tab === 'All Jobs' ? selectedTab : "text-gray-500"}`}
                onClick={() => { setTab('All Jobs') }}
              >
                All Jobs
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {renderContent()}
          </div>
        </>
      }
    </div>
  )
}

export default CompanyPage

/* 
===============================================================================
API
===============================================================================
*/

// function to get company name
const loadCompanyName = async (company_id, setCompanyName, setLoading) => {
  try {
    const res = await fetch(`/api/company?company_id=${company_id}`);
    const [data] = await res.json();
    setCompanyName(data.company_name);
  } catch (error) {
    console.log("Error fetching data from backend", error);
  } finally {
    setLoading(false);
  }
}