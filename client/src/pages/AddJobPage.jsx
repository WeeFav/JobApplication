import { useState, useEffect, useContext } from "react"
import { useNavigate } from "react-router-dom";
import { AccountContext } from "../App";
import { CompanysContext } from "../App";
import CustomCompany from "../components/AddJob/CustomCompany";
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

const AddJobPage = () => {
  const navigate = useNavigate();
  const accountContext = useContext(AccountContext);

  const [jobTitle, setJobTitle] = useState('');
  const [jobType, setJobType] = useState('Full-Time');
  const [jobLocation, setJobLocation] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobSalary, setJobSalary] = useState('Under $50K');

  const [companyName, setCompanyName] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyID, setCompanyID] = useState('');

  const [companyInfoButton, setCompanyInfoButton] = useState('exist');

  // alert popup
  const [open, setOpen] = useState(false);
  const handleClose = () => {
    setOpen(false);
  };

  const onSubmitFormClick = (e) => {
    e.preventDefault();
    let newJob;

    if (accountContext.isCompany) {
      newJob = {
        jobTitle,
        jobType,
        jobLocation,
        jobDescription,
        jobSalary,
        companyID: accountContext.ID,
        is_custom: 0
      }
    }
    else {
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
            company_name: companyName,
            company_description: companyDescription,
            company_email: companyEmail,
            company_phone: companyPhone,
            is_custom: 1
          }
        }
      }
    }
    
    addJobHandler(newJob, accountContext.ID);
    setOpen(true);
    setJobTitle('');
    setJobType('Full-Time');
    setJobLocation('');
    setJobDescription('');
    setJobSalary('Under $50K');
    setCompanyName('');
    setCompanyDescription('');
    setCompanyEmail('');
    setCompanyPhone('');
    // return navigate('/');
  };


  return (
    <>
      <section className="bg-website-lightGray">
        <div className="container m-auto max-w-2xl py-24">
          <div className="bg-white px-6 py-8 mb-4 shadow-md rounded-md border m-4 md:m-0">
            <form onSubmit={onSubmitFormClick}>
              <h2 className="text-3xl text-center font-semibold mb-6">Add Job</h2>

              {/* Job Section */}
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
                  {companyName,
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
                  setCompanyInfoButton}
                } />}

              {/* Add Job Button */}
              <div>
                <button
                  className="bg-website-blue hover:bg-website-gold text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline"
                  type="submit"
                >
                  Add Job
                </button>
                <Snackbar open={open} autoHideDuration={3000} onClose={handleClose} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                  <Alert
                    onClose={handleClose}
                    severity="success"
                    variant="filled"
                    sx={{ width: '100%' }}
                  >
                    Succesfully created job
                  </Alert>
                </Snackbar>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  )
}

export default AddJobPage

/* 
===============================================================================
API
===============================================================================
*/

// function to add job
export const addJobHandler = async (newJob, user_id) => {
  let res;

  // if custom company, add to database first
  if (newJob.company) {
    res = await fetch('/api/company', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newJob.company)
    }); 

    const {company_id} = await res.json();
    newJob['companyID'] = company_id;
  }

  // add job to database
  res = await fetch('/api/job', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(newJob)
  });

  const {job_id} = await res.json();

  // if custom job, add application to database
  if (newJob.is_custom) {
    const application = {
      job_id: job_id,
      user_id: user_id
    }
  
    res = await fetch('/api/application', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(application)
    });
  }
};