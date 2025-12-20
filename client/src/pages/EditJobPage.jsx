import { useLoaderData, Link } from "react-router-dom"
import { useState, useEffect, useRef } from "react"
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import { FaArrowLeft, FaMapMarker } from "react-icons/fa";

const EditJobPage = () => {
  const job = useLoaderData();
  const prev_description = job.description;

  const [title, setTitle] = useState(job.title);
  const [company, setCompany] = useState(job.company);
  const [description, setDescription] = useState(job.description);
  const [url, setUrl] = useState(job.url);
  const [location, setLocation] = useState(job.location);
  const [date, setDate] = useState(job.post_date);
  const wsRef = useRef(null);

  // alert popup
  const [open, setOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('success');

  const handleClose = () => setOpen(false);

  const onSubmitFormClick = async (e) => {
    e.preventDefault();

    // merge edited fields with other job fields
    const updatedJob = {
      ...job,
      title: title,
      company: company,
      description: description,
      url: url,
      location: location,
      post_date: date
    };

    await updateJobHandler(updatedJob, prev_description, wsRef, setOpen, setAlertMessage, setAlertSeverity);
  };

  return (
    <>
      <section className="bg-website-lightGray">

        <div className="py-4 px-6">
          <Link to={"/jobs"} className="text-website-blue hover:text-website-gold flex items-center">
            <FaArrowLeft className="mr-2" />
            Back to Job Listings
          </Link>
        </div>

        <div className="container m-auto max-w-2xl pb-24">
          <div className="bg-white px-6 py-8 mb-4 shadow-md rounded-md border m-4 md:m-0">
            <h2 className="text-3xl text-center font-semibold mb-6">Update Job</h2>

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
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
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
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  className="border rounded w-full py-2 px-3 mb-2"
                  placeholder="eg. Beautiful Apartment In Miami"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
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
                <label htmlFor="date" className="block text-gray-700 font-bold mb-2">
                  Date Posted
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  className="border rounded w-full py-2 px-3"
                  value={date ? date.split("T")[0] : ""}
                  onChange={(e) => setDate(e.target.value)}
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>

              {/* Update Job Button */}
              <div>
                <button
                  className="bg-website-blue hover:bg-website-gold text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline"
                  type="submit"
                >
                  Update Job
                </button>
                <Snackbar open={open} onClose={handleClose} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                  <Alert
                    onClose={handleClose}
                    severity={alertSeverity}
                    variant="filled"
                    sx={{ flex: 1 }}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      {alertMessage}
                      {alertSeverity === "success" ? <></> : <CircularProgress size="20px" color="white" />}
                    </div>
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

export default EditJobPage

/* 
===============================================================================
API
===============================================================================
*/

// function to update job
const updateJobHandler = async (updatedJob, prev_description, wsRef, setOpen, setAlertMessage, setAlertSeverity) => {
  return new Promise((resolve, reject) => {
    // Create socket
    const ws = new WebSocket('/ws_api/jobs');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to WebSocket');
      ws.send(JSON.stringify({ updatedJob: updatedJob, descriptionUpdated: (updatedJob.description !== prev_description) }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "insert") {
        if (msg.start) {
          console.log("start edit");
        }
        else if (msg.postgres) {
          setAlertMessage("Editing database");
          setAlertSeverity("info");
          setOpen(true);
        }
        else if (msg.qdrant) {
          setAlertMessage("Editing qdrant");
          setAlertSeverity("info");
        }
        else if (msg.success) {
          console.log("Job edit success");
          setAlertMessage("Job edit success");
          setAlertSeverity("success");
        }
        else if (msg.fail) {
          console.log("Job edit failed");
          setAlertMessage("Job edit failed");
          setAlertSeverity("error");
        }
      }
      else if (msg.type === "recommend") {
        if (msg.start) {
          console.log("start recommend");
          setAlertMessage("Start recommend");
          setAlertSeverity("info");
        }
        else if (msg.success) {
          console.log("Recommend success");
          setAlertMessage("Recommend success");
          setAlertSeverity("success");
        }
        else {
          console.log("Recommend failed");
          setAlertMessage("Recommend failed");
          setAlertSeverity("error");
        }
      }
    };

    ws.onclose = () => {
      console.log('Socket closed');
      wsRef.current = null;
      setTimeout(() => {
        setOpen(false);
      }, 3000);
      resolve();
    };
  })
};