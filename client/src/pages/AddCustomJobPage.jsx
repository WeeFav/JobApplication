import { useState, useEffect, useContext } from "react"
import { useNavigate } from "react-router-dom";
import { CompanysContext } from "../App";

const AddCustomJobPage = ({ addJobHandler }) => {
  const navigate = useNavigate();

  const [jobTitle, setJobTitle] = useState('');
  const [jobType, setJobType] = useState('Full-Time');
  const [jobLocation, setJobLocation] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobSalary, setJobSalary] = useState('Under $50K');
  const [companyName, setCompanyName] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');

  const [companyInfoButton, setCompanyInfoButton] = useState('exist');
  const [companyID, setCompanyID] = useState('');
  const {companys, loading} = useContext(CompanysContext);
  
  const onSubmitFormClick = (e) => {
    e.preventDefault();

    let newJob;

    if (companyInfoButton === 'exist') {
      newJob = {
        jobTitle,
        jobType,
        jobLocation,
        jobDescription,
        jobSalary,
        companyID,
        is_custom: 1
      }
    }
    else {
      newJob = {
        jobTitle,
        jobType,
        jobLocation,
        jobDescription,
        jobSalary,
        is_custom: 1,
        company: {
          companyName,
          companyDescription,
          companyEmail,
          companyPhone,
          is_custom: 1
        }
      }
    }

    addJobHandler(newJob);
    return navigate('/applied-jobs');
  };


  return (
    <>
      <section className="bg-website-lightGray">
        <div className="container m-auto max-w-2xl py-24">
          <div className="bg-white px-6 py-8 mb-4 shadow-md rounded-md border m-4 md:m-0">
            <form onSubmit={onSubmitFormClick}>
              <h2 className="text-3xl text-center font-semibold mb-6">Add Custom Job</h2>

              <div className="mb-4">
                <label htmlFor="type" className="block text-gray-700 font-bold mb-2">
                  Job Type
                </label>
                <select
                  id="type"
                  name="type"
                  className="border rounded w-full py-2 px-3"
                  required
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                >
                  <option value="Full-Time">Full-Time</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Remote">Remote</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-bold mb-2">
                  Job Listing Name
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  className="border rounded w-full py-2 px-3 mb-2"
                  placeholder="eg. Beautiful Apartment In Miami"
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="description"
                  className="block text-gray-700 font-bold mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  className="border rounded w-full py-2 px-3"
                  rows="4"
                  placeholder="Add any job duties, expectations, requirements, etc"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                ></textarea>
              </div>

              <div className="mb-4">
                <label htmlFor="type" className="block text-gray-700 font-bold mb-2">
                  Salary
                </label>
                <select
                  id="salary"
                  name="salary"
                  className="border rounded w-full py-2 px-3"
                  required
                  value={jobSalary}
                  onChange={(e) => setJobSalary(e.target.value)}
                >
                  <option value="Under $50K">Under $50K</option>
                  <option value="$50K - 60K">$50K - $60K</option>
                  <option value="$60K - 70K">$60K - $70K</option>
                  <option value="$70K - 80K">$70K - $80K</option>
                  <option value="$80K - 90K">$80K - $90K</option>
                  <option value="$90K - 100K">$90K - $100K</option>
                  <option value="$100K - 125K">$100K - $125K</option>
                  <option value="$125K - 150K">$125K - $150K</option>
                  <option value="$150K - 175K">$150K - $175K</option>
                  <option value="$175K - 200K">$175K - $200K</option>
                  <option value="Over $200K">Over $200K</option>
                </select>
              </div>

              <div className='mb-4'>
                <label className='block text-gray-700 font-bold mb-2'>
                  Location
                </label>
                <input
                  type='text'
                  id='location'
                  name='location'
                  className='border rounded w-full py-2 px-3 mb-2'
                  placeholder='Company Location'
                  required
                  value={jobLocation}
                  onChange={(e) => setJobLocation(e.target.value)}
                />
              </div>

              <h3 className="text-2xl mb-5">Company Info</h3>

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
                      onChange={(e) => setCompanyID(e.target.value)}
                    >
                      <option value="" disabled>Select a company</option>
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
              <div>
                <button
                  className="bg-website-blue hover:bg-website-gold text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline"
                  type="submit"
                >
                  Add Job
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  )
}

export default AddCustomJobPage