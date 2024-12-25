import { useContext, useState } from "react";
import { CompanysContext } from "../../App";
import { Autocomplete } from "@mui/material";
import TextField from '@mui/material/TextField';

const CustomCompany = ({ param }) => {
  const { companys, loading } = useContext(CompanysContext);
  const [selectedId, setSelectedId] = useState();
  const {
    companyName,
    companyDescription,
    companyEmail,
    companyPhone,
    companyID,
    companyInfoButton,
    setCompanyName,
    setCompanyDescription,
    setCompanyEmail,
    setCompanyPhone,
    setCompanyID,
    setCompanyInfoButton
  } = param;

  return (
    <>
      {/* Custom Company Section */}
      <h3 className="text-2xl mb-5"> Company Info</h3 >
      <div className="flex items-center justify-center h-full">
        <div className="flex w-full space-x-4 mb-5">
          <button
            className={`w-1/2 px-4 py-2 rounded ${companyInfoButton === 'exist' ? 'bg-website-blue text-white' : 'bg-gray-100 text-black'
              } hover:bg-website-blue hover:text-white`}
            onClick={() => setCompanyInfoButton('exist')}>
            exist
          </button>
          <button
            className={`w-1/2 px-4 py-2 rounded ${companyInfoButton === 'new' ? 'bg-website-blue text-white' : 'bg-gray-100 text-black'
              } hover:bg-website-blue hover:text-white`}
            onClick={() => setCompanyInfoButton('new')}>
            new
          </button>
        </div>
      </div>

      {companyInfoButton === 'exist' ?
        <>
          {loading ?
            <div>loading</div>
            :
            <select
              id="chooseCompany"
              name="chooseCompany"
              className="border rounded w-full py-2 px-3 mb-4"
              required
              value={companyID}
              onChange={(e) => setCompanyID(e.target.value)}>

              <option value='' disabled>Select a company</option>
              {companys.map((company) => <option key={company.company_id} value={company.company_id}>{company.company_name}</option>)}
            </select>
          }
        </>
        :
        <>
          <div className="mb-4">
            <label htmlFor="company" className="block text-gray-700 font-bold mb-2">
              Company Name
            </label>
            <input
              type="text"
              id="company"
              name="company"
              className="border rounded w-full py-2 px-3"
              placeholder="Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="company_description"
              className="block text-gray-700 font-bold mb-2">
              Company Description
            </label>
            <textarea
              id="company_description"
              name="company_description"
              className="border rounded w-full py-2 px-3"
              rows="4"
              placeholder="What does your company do?"
              value={companyDescription}
              onChange={(e) => setCompanyDescription(e.target.value)}
            ></textarea>
          </div>

          <div className="mb-4">
            <label
              htmlFor="contact_email"
              className="block text-gray-700 font-bold mb-2">
              Contact Email
            </label>
            <input
              type="email"
              id="contact_email"
              name="contact_email"
              className="border rounded w-full py-2 px-3"
              placeholder="Email address for applicants"
              required
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="contact_phone"
              className="block text-gray-700 font-bold mb-2">
              Contact Phone
            </label>
            <input
              type="tel"
              id="contact_phone"
              name="contact_phone"
              className="border rounded w-full py-2 px-3"
              placeholder="Optional phone for applicants"
              value={companyPhone}
              onChange={(e) => setCompanyPhone(e.target.value)}
            />
          </div>
        </>
      }
    </>
  )
}

export default CustomCompany