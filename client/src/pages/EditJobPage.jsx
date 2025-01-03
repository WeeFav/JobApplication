import { useParams, useLoaderData, useNavigate } from "react-router-dom"
import { useState, useContext, useEffect } from "react"
import CustomCompany from "../components/AddJob/CustomCompany";
import { AccountContext } from "../App";
import { CompanysContext } from "../App";

const EditJobPage = () => {
  const navigate = useNavigate();
  const job = useLoaderData();
  const accountContext = useContext(AccountContext);
  const { companys, loading } = useContext(CompanysContext);

  let { id } = useParams();
  id = parseInt(id);

  const [jobTitle, setJobTitle] = useState(job.job_title);
  const [jobType, setJobType] = useState(job.job_type);
  const [jobDescription, setJobDescription] = useState(job.job_description);
  const [jobLocation, setJobLocation] = useState(job.job_location);
  const [jobSalary, setJobSalary] = useState(job.job_salary);

  const [companyID, setCompanyID] = useState(job.company_id);
  const [selectedCompanyID, setSelectedCompanyID] = useState(job.custom_company ? '' : job.company_id);
  const [companyName, setCompanyName] = useState(job.company_name);
  const [companyDescription, setCompanyDescription] = useState(job.company_description);
  const [companyEmail, setCompanyEmail] = useState(job.company_email);
  const [companyPhone, setCompanyPhone] = useState(job.company_phone);
  const prevcompanyInfoButton = job.custom_company ? 'new' : 'exist';
  const [companyInfoButton, setCompanyInfoButton] = useState(job.custom_company ? 'new' : 'exist');

  const onSubmitFormClick = async (e) => {
    e.preventDefault();

    let finalCompanyID = companyInfoButton === 'exist' ? selectedCompanyID : companyID;

    let updatedJob;

    if (accountContext.isCompany) {
      // company updating job
      updatedJob = {
        job_id: id,
        jobTitle,
        jobType,
        jobDescription,
        jobLocation,
        jobSalary,
        companyID: finalCompanyID
      };
    }
    else {
      if (companyInfoButton === 'exist') {
        // user updating custom job / change company
        updatedJob = {
          job_id: id,
          jobTitle,
          jobType,
          jobDescription,
          jobLocation,
          jobSalary,
          companyID: finalCompanyID
        };
      }
      else {
        // user updating custom job / custom company
        updatedJob = {
          job_id: id,
          jobTitle,
          jobType,
          jobDescription,
          jobLocation,
          jobSalary,
          companyID: finalCompanyID,
          company: {
            company_name: companyName,
            company_description: companyDescription,
            company_email: companyEmail,
            company_phone: companyPhone
          }
        }
      }
    }


    await updateJobHandler(updatedJob, prevcompanyInfoButton, companyID);
    return navigate(`/jobs/${id}`);
  };

  return (
    <>
      <section className="bg-website-lightGray">
        <div className="container m-auto max-w-2xl py-24">
          <div className="bg-white px-6 py-8 mb-4 shadow-md rounded-md border m-4 md:m-0">
            <form onSubmit={onSubmitFormClick}>
              <h2 className="text-3xl text-center font-semibold mb-6">Update Job</h2>

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

              {accountContext.isCompany ?
                <></>
                :
                <CustomCompany param={
                  {
                    companyName,
                    companyDescription,
                    companyEmail,
                    companyPhone,
                    selectedCompanyID,
                    companyInfoButton,
                    setCompanyName,
                    setCompanyDescription,
                    setCompanyEmail,
                    setCompanyPhone,
                    setSelectedCompanyID,
                    setCompanyInfoButton,
                  }
                } />
              }

              {/* Update Job Button */}
              <div>
                <button
                  className="bg-website-blue hover:bg-website-gold text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline"
                  type="submit"
                >
                  Update Job
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  )
}

export default EditJobPage

/* 
===============================================================================
API
===============================================================================
*/

// function to update job
const updateJobHandler = async (updatedJob, prevcompanyInfoButton, deleteCompanyID) => {
  let res;

  if (updatedJob.company && prevcompanyInfoButton == 'new') {
    // if user update custom company, update company database
    updatedJob.company['company_id'] = updatedJob.companyID; // add company_id to company object to identify which company to update
    res = await fetch('/api/company', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedJob.company)
    });
  }
  else if (updatedJob.company && prevcompanyInfoButton == 'exist') {
    // if user add custom company, add to company database
    updatedJob.company['is_custom'] = 1; // add is_custom to company object
    res = await fetch('/api/company', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedJob.company)
    }); 

    const {company_id} = await res.json();
    updatedJob['companyID'] = company_id; // replace original (exist) company id with new custom company id
  }
  
  // update job
  res = await fetch('/api/job', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updatedJob)
  });

  if (!updatedJob.company && prevcompanyInfoButton == 'new') {
    // if user update company to existing company, delete old custom company
    res = await fetch(`/api/company?company_id=${deleteCompanyID}`, {
      method: 'DELETE'
    });
  }
};