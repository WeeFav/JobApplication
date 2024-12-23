import React from 'react'

const CompanyInfoTab = ({ profileInfo }) => {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 w-[400px]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Company Information</h3>
        <button className="text-gray-400 hover:text-gray-600">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit
          </span>
        </button>
      </div>
      <div>
        <label className="block text-sm text-gray-500">Company Description</label>
        <div className="mt-1 text-gray-700">{profileInfo.company_description}</div>
      </div>
      <div>
        <label className="block text-sm text-gray-500">Company Phone</label>
        <div className="mt-1 text-gray-700">{profileInfo.company_phone}</div>
      </div>
    </div>
  )
}

export default CompanyInfoTab