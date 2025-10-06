import { useState, useEffect, useContext } from "react"
import { useNavigate } from "react-router-dom";
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

const JobForm = () => {
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [url, setUrl] = useState('');

  // alert popup
  const [open, setOpen] = useState(false);
  const handleClose = () => {
    setOpen(false);
  };

  const onSubmitFormClick = (e) => {
    e.preventDefault();
    let newJob;

    newJob = {
      job_title: jobTitle,
      company: company,
      job_description: jobDescription,
      job_url: url
    }

    addJobHandler(newJob);
    setOpen(true);
    setJobTitle('');
    setJobDescription('');
    setCompany('');
    setUrl('');
    // return navigate('/');
  };


  return (
    <>
      <form onSubmit={onSubmitFormClick}>
        <div className="mb-4">
          <label className="block text-gray-700 font-bold mb-2">
            Job Title
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
          <label className="block text-gray-700 font-bold mb-2">
            Company
          </label>
          <input
            type="text"
            id="company"
            name="company"
            className="border rounded w-full py-2 px-3 mb-2"
            placeholder="eg. Beautiful Apartment In Miami"
            required
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 font-bold mb-2">
            URL
          </label>
          <input
            type="text"
            id="url"
            name="url"
            className="border rounded w-full py-2 px-3 mb-2"
            placeholder="eg. Beautiful Apartment In Miami"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
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
    </>
  )
}

export default JobForm

/* 
===============================================================================
API
===============================================================================
*/

// function to add job
const addJobHandler = async (newJob) => {
  let res;

  // add job to database
  res = await fetch('/api/jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(newJob)
  });

  const { job_id } = await res.json();

};