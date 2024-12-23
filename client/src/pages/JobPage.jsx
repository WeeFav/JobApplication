import { useLoaderData, useNavigate } from "react-router-dom"
import { FaArrowLeft, FaMapMarker } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useState, useContext, useEffect } from "react"
import { AccountContext } from "../App";

const JobPage = ({ deleteJobHandler }) => {
  const accountContext = useContext(AccountContext);

  const job = useLoaderData();
  const navigate = useNavigate();

  const onDeleteClick = async () => {
    const confirm = window.confirm('Are you sure you want to delete this job?');

    if (confirm) {
      await deleteJobHandler(job.id);
      navigate('/company-jobs');
    }

  };

  return (
    <>
      <section>
        <div className="container m-auto py-4 px-6">
          <Link to={accountContext.isCompany ? "/company-jobs" : "/jobs"} className="text-website-blue hover:text-website-gold flex items-center">
            <FaArrowLeft className="mr-2" />
            Back to Job Listings
          </Link>
        </div>
      </section>

      <section className="bg-website-lightGray">
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

              <div className="bg-white p-6 rounded-lg shadow-md mt-6">
                <h3 className="text-xl font-bold mb-6">Manage Job</h3>
                {accountContext.isCompany ?
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
                  <button
                    className="bg-website-blue hover:bg-website-gold text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline mt-4 block"
                  >
                    Apply Job
                  </button>
                }
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  )
}

export default JobPage;