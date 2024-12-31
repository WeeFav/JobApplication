import { useState } from "react";
import AllJobsTab from "../components/Companies/AllJobsTab";
import AppliedJobsTab from "../components/Companies/AppliedJobsTab";

const CompanyPage = () => {
  const [tab, setTab] = useState('Recommended Jobs')
  const selectedTab = "bg-website-gold text-white"

  const renderContent = () => {
    switch (tab) {
      case 'Recommended Jobs':
        return <></>;
      case 'Applied Jobs':
        return <AppliedJobsTab />;
      case 'All Jobs':
        return <AllJobsTab />;
      default:
        return <div>Select a tab to view content</div>;
    }
  };

  return (
    <div className="flex flex-grow gap-6">
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
    </div>
  )
}

export default CompanyPage