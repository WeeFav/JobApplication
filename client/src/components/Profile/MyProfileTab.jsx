import { useState, useContext } from "react";
import { AccountContext } from "../../App";

const MyProfileTab = ({ profileInfo }) => {
  const accountContext = useContext(AccountContext);

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 w-[400px]" >
      <div className="flex">
        <img
          src="https://www.svgrepo.com/show/490660/company.svg"
          alt="Profile"
          className="w-16 h-16 rounded-full mr-4"
        />
        <div className="w-full">
          <div className="flex w-full items-center mb-1 justify-between">
            <h2 className="text-lg font-semibold">{profileInfo.company_name}</h2>
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
            <p className="text-gray-500">Company</p>
            <p className="text-gray-500">Email: {profileInfo.company_email}</p>
            <p className="text-gray-500">Company ID: {profileInfo.company_id}</p>
          </div>
        </div>
      </div>
    </div >
  )
}

export default MyProfileTab