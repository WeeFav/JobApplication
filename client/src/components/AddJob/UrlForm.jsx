import { useState, useEffect, useRef } from "react"
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';

const UrlForm = () => {
  const [url, setUrl] = useState('');
  const wsRef = useRef(null);

  // alert popup
  const [open, setOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('success');
  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }

    setOpen(false);
  };

  const onSubmitFormClick = async (e) => {
    e.preventDefault();
    await addJobHandler(url, wsRef, setOpen, setAlertMessage, setAlertSeverity);
  };

  return (
    <>
      <form onSubmit={onSubmitFormClick}>
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

        {/* Add Job Button */}
        <div>
          <button
            className="bg-website-blue hover:bg-website-gold text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline"
            type="submit"
          >
            Add Job
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
    </>
  )
}

export default UrlForm

/* 
===============================================================================
API
===============================================================================
*/

// function to add job
const addJobHandler = async (url, wsRef, setOpen, setAlertMessage, setAlertSeverity) => {
  return new Promise((resolve, reject) => {
    // Create socket
    const ws = new WebSocket('/ws_api/scrape_url');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to WebSocket');
      ws.send(JSON.stringify({ url: url }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "scrape") {
        if (msg.start) {
          console.log("start scrape");
          setAlertMessage("Start scrape");
          setAlertSeverity("info");
          setOpen(true);
        }
        else if (msg.success) {
          console.log("Scrape success");
          setAlertMessage("Scrape success");
          setAlertSeverity("success");
        }
        else if (msg.fail) {
          console.log("Scrape failed");
          setAlertMessage("Scrape failed");
          setAlertSeverity("error");
        }
      }
      else if (msg.type === "insert") {
        if (msg.start) {
          console.log("start insert");
        }
        else if (msg.postgres) {
          setAlertMessage("Inserting into database");
          setAlertSeverity("info");
          setOpen(true);
        }
        else if (msg.qdrant) {
          setAlertMessage("Inserting into qdrant");
          setAlertSeverity("info");
        }
        else if (msg.success) {
          console.log("Job insert success");
          setAlertMessage("Job insert success");
          setAlertSeverity("success");
        }
        else if (msg.fail) {
          console.log("Job insert failed");
          setAlertMessage("Job insert failed");
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
        else if (msg.fail) {
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
}
