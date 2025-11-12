import { useEffect, useState } from "react";
import MyProfileTab from "../components/Profile/MyProfileTab";
import UserInfoTab from "../components/Profile/UserInfoTab";

const ProfilePage = () => {
  const [tab, setTab] = useState('My Profile');
  const selectedTab = "bg-website-blue text-white rounded py-1 font-medium"

  const renderContent = () => {
    switch (tab) {
      case 'My Profile':
        return <MyProfileTab />;
      case 'Resumes':
        return <UserInfoTab />;
      default:
        return <div>Select a tab to view content</div>;
    }
  };

  return (
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
              <button className={`pl-4 w-full text-left ${tab === 'User Info' ? selectedTab : "text-gray-500"}`}
                onClick={() => { setTab('Resumes') }}
              >
                Resumes
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
  )
}

export default ProfilePage