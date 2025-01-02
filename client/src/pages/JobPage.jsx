import { useLoaderData, useNavigate } from "react-router-dom"
import { FaArrowLeft, FaMapMarker } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useState, useContext, useEffect } from "react"
import { AccountContext } from "../App";
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

const JobPage = () => {
  const accountContext = useContext(AccountContext);
  const navigate = useNavigate();

  const job = useLoaderData();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const [applied, setApplied] = useState(false);

  const [openApply, setOpenApply] = useState(false);
  const [openUnapply, setOpenUnapply] = useState(false);
  const handleApplyClose = () => {
    setOpenApply(false);
  };
  const handleUnapplyClose = () => {
    setOpenUnapply(false);
  };

  useEffect(() => {
    loadApplications(accountContext.ID, job.job_id, setApplications, setLoading)
  }, [applied]);

  useEffect(() => {
    setApplied(applications.length > 0);
  }, [applications])

  const onDeleteClick = async () => {
    const confirm = window.confirm('Are you sure you want to delete this job?');

    if (confirm) {
      await deleteJobHandler(job.id);
      navigate('/company-jobs');
    }

  };


  const onApplyClick = async () => {
    const application = {
      job_id: job.job_id,
      user_id: accountContext.ID
    }

    await applyJobHandler(application);
    setOpenApply(true);
    setApplied(true);
  }

  const onUnapplyClick = async () => {
    await unapplyJobHandler(applications[0].application_id)
    setOpenUnapply(true);
    setApplied(false);
  }


  return (
    <div className="flex flex-col flex-grow">
      <section>
        <div className="container m-auto py-4 px-6">
          <Link to={accountContext.isCompany ? "/company-jobs" : "/jobs"} className="text-website-blue hover:text-website-gold flex items-center">
            <FaArrowLeft className="mr-2" />
            Back to Job Listings
          </Link>
        </div>
      </section>

      <section className="bg-website-lightGray flex-grow">
        <div className="container m-auto py-10 px-6">
          <div className="grid grid-cols-1 md:grid-cols-[70%_30%] w-full gap-6">
            <main>
              <div
                className="bg-white p-6 rounded-lg shadow-md text-center md:text-left"
              >
                <div className="text-gray-500 mb-4">{job.job_type}</div>
                <h1 className="text-3xl font-bold mb-4">
                  {job.job_title}
                </h1>
                <div className="text-gray-500 mb-4 flex align-middle justify-center md:justify-start">
                  <FaMapMarker className="text-orange-700 mr-1 mt-1" />
                  <p className="text-orange-700">{job.job_location}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md mt-6">
                <h3 className="text-website-blue text-lg font-bold mb-6">
                  Job Description
                </h3>

                <p className="mb-4">
                  {job.job_description}
                </p>

                <h3 className="text-website-blue text-lg font-bold mb-2">Salary</h3>

                <p className="mb-4">{job.job_salary} / Year</p>
              </div>
            </main>

            <aside>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold mb-6">Company Info</h3>

                <h2 className="text-2xl">{job.company_name}</h2>

                <p className="my-2">
                  {job.company_description}
                </p>

                <hr className="my-4" />

                <h3 className="text-xl">Contact Email:</h3>

                <p className="my-2 bg-website-lightGray p-2 font-bold">
                  {job.company_email}
                </p>

                <h3 className="text-xl">Contact Phone:</h3>

                <p className="my-2 bg-website-lightGray p-2 font-bold">{job.company_phone}</p>
              </div>

              {loading ?
                <div>loading</div>
                :
                <div className="bg-white p-6 rounded-lg shadow-md mt-6">
                  <h3 className="text-xl font-bold mb-6">Manage Job</h3>
                  {accountContext.isCompany || (!accountContext.isCompany && job.custom_job) ?
                    <>
                      <Link
                        to={`/jobs/edit/${job.job_id}`}
                        className="bg-website-blue hover:bg-website-gold text-white text-center font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline mt-4 block">
                        Edit Job
                      </Link>
                      <button
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline mt-4 block"
                        onClick={onDeleteClick}
                      >
                        Delete Job
                      </button>
                    </>
                    :
                    <>
                      {applied ?
                        <>
                          <button
                            className="bg-website-blue hover:bg-website-gold text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline mt-4 block"
                            onClick={onUnapplyClick}
                          >
                            Unapply
                          </button>

                        </>
                        :
                        <>
                          <button
                            className="bg-website-blue hover:bg-website-gold text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline mt-4 block"
                            onClick={onApplyClick}
                          >
                            Apply Job
                          </button>
                        </>
                      }
                    </>
                  }
                  <Snackbar open={openUnapply} autoHideDuration={3000} onClose={handleUnapplyClose} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                    <Alert
                      onClose={handleUnapplyClose}
                      severity="success"
                      variant="filled"
                      sx={{ width: '100%' }}
                    >
                      Job unapplied
                    </Alert>
                  </Snackbar>
                  <Snackbar open={openApply} autoHideDuration={3000} onClose={handleApplyClose} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                    <Alert
                      onClose={handleApplyClose}
                      severity="success"
                      variant="filled"
                      sx={{ width: '100%' }}
                    >
                      Job applied
                    </Alert>
                  </Snackbar>
                </div>
              }
            </aside>
          </div>
        </div>
      </section>
    </div>
  )
}

export default JobPage;

/* 
===============================================================================
API
===============================================================================
*/

// function to load application to this job
const loadApplications = async (user_id, job_id, setApplications, setLoading) => {
  try {
    const res = await fetch(`/api/application?user_id=${user_id}&job_id=${job_id}`);
    const data = await res.json();
    setApplications(data);
  } catch (error) {
    console.log("Error fetching data from backend", error);
  } finally {
    setLoading(false);
  }
}

// function to delete job
const deleteJobHandler = async (id) => {
  await fetch(`/api/jobs/${id}`, {
    method: 'DELETE'
  });
};


// function to apply job
const applyJobHandler = async (application) => {
  const res = await fetch('/api/application', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(application)
  });
}

// function to unapply job
const unapplyJobHandler = async (application_id) => {
  const res = await fetch(`/api/application?application_id=${application_id}`, {
    method: 'DELETE'
  });
};