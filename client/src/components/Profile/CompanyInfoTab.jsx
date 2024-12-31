import { useState } from "react"

const CompanyInfoTab = ({ profileInfo }) => {
  const [edit, setEdit] = useState(false)
  const [companyDescription, setCompanyDescription] = useState(profileInfo.company_description)
  const [companyPhone, setCompanyPhone] = useState(profileInfo.company_phone)

  const onSubmitFormClick = () => {
    const updatedCompany = {
      company_id: profileInfo.company_id,
      company_name: profileInfo.company_name,
      company_description: companyDescription,
      company_email: profileInfo.company_email,
      company_phone: companyPhone,
      is_custom: profileInfo.is_custom,
      company_image: profileInfo.company_image
    }
    updateCompanyHandler(updatedCompany)
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 w-[400px]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Company Information</h3>
        <button
          className="text-gray-400 hover:text-gray-600"
          onClick={() => { setEdit((prevState) => !prevState) }}>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit
          </span>
        </button>
      </div>
      {!edit ?
        <div>
          <div>
            <label className="block text-sm text-gray-500">Company Description</label>
            <div className="mt-1 text-gray-700">{companyDescription}</div>
          </div>
          <div>
            <label className="block text-sm text-gray-500">Company Phone</label>
            <div className="mt-1 text-gray-700">{companyPhone}</div>
          </div>
        </div>
        :
        <form onSubmit={onSubmitFormClick}>
          <div>
            <label className="block text-sm text-gray-500">Company Description</label>
            <input
              type="text"
              id="description"
              name="description"
              className="border rounded w-full py-2 px-3 mb-2"
              required
              value={companyDescription}
              onChange={(e) => setCompanyDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500">Company Phone</label>
            <input
              type="text"
              id="phone"
              name="phone"
              className="border rounded w-full py-2 px-3 mb-2"
              required
              value={companyPhone}
              onChange={(e) => setCompanyPhone(e.target.value)}
            />
          </div>
          <div className="flex justify-center">
            <button
              className="bg-website-blue hover:bg-website-gold text-white py-1 px-4 rounded-full mt-2"
              type="submit">
              Make Change
            </button>
          </div>
        </form>
      }
    </div>
  )
}

export default CompanyInfoTab

/* 
===============================================================================
API
===============================================================================
*/

// function to update company
const updateCompanyHandler = async (updatedCompany) => {
  const res = await fetch('/api/company', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updatedCompany)
  });
};