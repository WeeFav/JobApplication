import { AccountContext } from "../App";
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MyProfileTab from "../components/Profile/MyProfileTab";
import CompanyInfoTab from "../components/Profile/CompanyInfoTab";
import ChangePasswordTab from "../components/Profile/ChangePasswordTab";
import DeleteAccountTab from "../components/Profile/DeleteAccountTab";

const ProfilePage = () => {
  const navigate = useNavigate();
  const accountContext = useContext(AccountContext);

  const [profileInfo, setProfileInfo] = useState();
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState('My Profile')
  const selectedTab = "bg-website-blue text-white rounded py-1 font-medium"

  useEffect(() => {
    if (accountContext.isCompany) {
      loadCompanyProfile(accountContext.ID, setProfileInfo, setLoading);
    }
    else {
      loadUserProfile(accountContext.ID, setProfileInfo, setLoading);
    }
  }, [])

  const renderContent = () => {
    switch (tab) {
      case 'My Profile':
        return <MyProfileTab profileInfo={profileInfo} />;
      case 'Company Info':
        return <CompanyInfoTab profileInfo={profileInfo} />;
      case 'Change Password':
        return <ChangePasswordTab profileInfo={profileInfo} />;
      case 'Delete Account':
        return <DeleteAccountTab profileInfo={profileInfo} />;
      default:
        return <div>Select a tab to view content</div>;
    }
  };

  return (
    <>
      {loading ?
        <div>loading</div>
        :
        <div className="bg-website-blue flex flex-col flex-grow items-center justify-center">
          <div className="bg-white rounded-xl max-w-4xl mx-auto p-7">
            <div className="flex gap-6">
              {/* Sidebar */}
              <div className="w-40 mt-[53px]">
                <nav className="space-y-4">
                  <button className={`pl-4 w-full text-left ${tab === 'My Profile' ? selectedTab : "text-gray-500"}`}
                    onClick={() => { setTab('My Profile') }}
                  >
                    My Profile
                  </button>
                  {!accountContext.isCompany ?
                    <></>
                    :
                    <button className={`pl-4 w-full text-left ${tab === 'Company Info' ? selectedTab : "text-gray-500"}`}
                      onClick={() => { setTab('Company Info') }}
                    >
                      Company Info
                    </button>
                  }
                  <button className={`pl-4 w-full text-left ${tab === 'Change Password' ? selectedTab : "text-gray-500"}`}
                    onClick={() => { setTab('Change Password') }}
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
                  <button className={`pl-4 w-full text-left ${tab === 'Delete Account' ? selectedTab : "text-gray-500"}`}
                    onClick={() => { setTab('Delete Account') }}
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
        </div>
      }
    </>
  )
}

export default ProfilePage

/* 
===============================================================================
API
===============================================================================
*/

// function to load user profile
const loadUserProfile = async (user_id, setProfileInfo, setLoading) => {
  try {
    const res = await fetch(`/api/user?user_id=${user_id}`);
    const data = await res.json();
    setProfileInfo(data);
  } catch (error) {
    console.log("Error fetching data from backend", error);
  } finally {
    setLoading(false);
  }
};

// function to load company profile
const loadCompanyProfile = async (company_id, setProfileInfo, setLoading) => {
  console.log(1)
  try {
    const res = await fetch(`/api/company?company_id=${company_id}`);
    const [data] = await res.json();
    console.log(data) 
    setProfileInfo(data);
  } catch (error) {
    console.log("Error fetching data from backend", error);
  } finally {
    setLoading(false);
  }
};
