import { useState, useEffect, useRef } from "react"
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

const JobForm = () => {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const wsRef = useRef(null);

  // alert popup
  const [open, setOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('success');

  const handleClose = () => setOpen(false);

  const onSubmitFormClick = async (e) => {
    e.preventDefault();

    let newJob = {
      title: title,
      company: company,
      description: description,
      url: url,
      location: location,
      post_date: date
    }

    const res = await addJobHandler(newJob, wsRef);

    if (res.success) {
      setAlertSeverity('success');
      setAlertMessage('Succesfully created job');
    }
    else {
      setAlertSeverity('error');
      setAlertMessage(res.message);
    }

    setOpen(true);
    setTitle('');
    setDescription('');
    setCompany('');
    setUrl('');
    setLocation('');
    setDate('');
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
            value={date}
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
              severity={alertSeverity}
              variant="filled"
              sx={{ width: '100%' }}
            >
              {alertMessage}
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
const addJobHandler = async (newJob, wsRef) => {
  // Create socket
  const ws = new WebSocket('ws://localhost:8080/jobs');
  wsRef.current = ws;

  ws.onopen = () => {
    console.log('Connected to WebSocket');
    ws.send(JSON.stringify({ newJobs: [newJob], type: "manual" }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "insert") {
      if (msg.start) {
        console.log("start insert");
      }      
      else if (msg.success) {
        console.log("Job insert success");
      }
      else {
        console.log("Job insert failed");
      }
    }
    else if (msg.type === "recommend") {
      if (msg.start) {
        console.log("start recommend");
      }      
      else if (msg.success) {
        console.log("Recommend success");
      }
      else {
        console.log("Recommend failed");
      }
    }
  };

  ws.onclose = () => {
    console.log('Socket closed');
    wsRef.current = null;
  };

};