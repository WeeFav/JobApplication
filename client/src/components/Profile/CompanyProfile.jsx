import { useState, useContext } from "react";
import { AccountContext } from "../../App";
import { useNavigate } from "react-router-dom";
import MyProfileTab from "./MyProfileTab";
import CompanyInfoTab from "./CompanyInfoTab";

const CompanyProfile = ({ profileInfo }) => {
  const navigate = useNavigate();
  const accountContext = useContext(AccountContext);
  const [tab, setTab] = useState('my profile')
  const selectedTab = "bg-website-blue text-white rounded py-1 font-medium"

  const renderContent = () => {
    switch (tab) {
      case 'my profile':
        return <MyProfileTab profileInfo={profileInfo}/>;
      case 'company info':
        return <CompanyInfoTab profileInfo={profileInfo}/>;
      default:
        return <div>Select a tab to view content</div>;
    }
  };

  return (
    <div className="bg-white rounded-xl max-w-4xl mx-auto p-7">
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-40 mt-[53px]">
          <nav className="space-y-4">
            <button className={`pl-4 w-full text-left ${tab === 'my profile' ? selectedTab : "text-gray-500"}`}
              onClick={() => { setTab('my profile') }}
            >
              My Profile
            </button>
            <button className={`pl-4 w-full text-left ${tab === 'company info' ? selectedTab : "text-gray-500"}`}
              onClick={() => { setTab('company info') }}
            >
              Company Info
            </button>
            <button className={`pl-4 w-full text-left ${tab === 'change password' ? selectedTab : "text-gray-500"}`}
              onClick={() => { setTab('change password') }}
            >
              Change Password
            </button>
            <button className={`pl-4 w-full text-left ${tab === 'log out' ? selectedTab : "text-gray-500"}`}
              onClick={() => {
                setTab('log out')
                sessionStorage.clear();
                accountContext.setID(NaN);
                accountContext.setIsCompany(NaN);
                navigate('/login')
              }}
            >
              Log Out
            </button>
            <button className={`pl-4 w-full text-left ${tab === 'delete account' ? selectedTab : "text-gray-500"}`}
              onClick={() => { setTab('delete account') }}
            >
              Delete Account
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <h1 className="text-xl font-semibold text-gray-900">My Profile</h1>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default CompanyProfile

/* 
===============================================================================
API
===============================================================================
*/

// function to update company
export const updateCompanyHandler = async (updatedCompany) => {
  const res = await fetch('/api/company', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updatedCompany)
  });
};