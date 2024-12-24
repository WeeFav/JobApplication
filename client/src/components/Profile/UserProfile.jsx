import { useState, useContext } from "react";
import { AccountContext } from "../../App";
import { useNavigate } from "react-router-dom";


const UserProfile = ({ profileInfo }) => {
  const navigate = useNavigate();
  const accountContext = useContext(AccountContext);
  const [tab, setTab] = useState('my profile')
  const selectedTab = "bg-website-blue text-white rounded py-1 font-medium"

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

          {/* Profile Header */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex">
              <img
                src="https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
                alt="Profile"
                className="w-16 h-16 rounded-full mr-4"
              />
              <div>
                <div className="flex items-center gap-[148px] mb-1">
                  <h2 className="text-lg font-semibold">{profileInfo.user_name}</h2>
                  <button className="text-gray-400 hover:text-gray-600">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit
                    </span>
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-gray-500">Applicant</p>
                  <p className="text-gray-500">Email: {profileInfo.user_email}</p>
                  <p className="text-gray-500">User ID: {profileInfo.user_id}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          {/* <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Personal Information</h3>
              <button className="text-gray-400 hover:text-gray-600">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit
                </span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-500">First Name</label>
                <div className="mt-1 text-gray-700">Jack</div>
              </div>
              <div>
                <label className="block text-sm text-gray-500">Last Name</label>
                <div className="mt-1 text-gray-700">Adams</div>
              </div>
              <div>
                <label className="block text-sm text-gray-500">Email address</label>
                <div className="mt-1 text-gray-700">jackadams@gmail.com</div>
              </div>
              <div>
                <label className="block text-sm text-gray-500">Phone</label>
                <div className="mt-1 text-gray-700">(213) 555-1234</div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-500">Bio</label>
                <div className="mt-1 text-gray-700">Product Designer</div>
              </div>
            </div>
          </div> */}

          {/* Address */}
          {/* <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Address</h3>
              <button className="text-gray-400 hover:text-gray-600">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit
                </span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-500">Country</label>
                <div className="mt-1 text-gray-700">United States of America</div>
              </div>
              <div>
                <label className="block text-sm text-gray-500">City/State</label>
                <div className="mt-1 text-gray-700">California,USA</div>
              </div>
              <div>
                <label className="block text-sm text-gray-500">Postal Code</label>
                <div className="mt-1 text-gray-700">ERT 62574</div>
              </div>
              <div>
                <label className="block text-sm text-gray-500">TAX ID</label>
                <div className="mt-1 text-gray-700">AS564178969</div>
              </div>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;