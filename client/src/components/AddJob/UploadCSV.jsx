import { useState, useEffect, useContext } from "react"
import { useNavigate } from "react-router-dom";
import { AccountContext } from "../../App";
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Tooltip from '@mui/material/Tooltip';

const UploadCSV = () => {
  const accountContext = useContext(AccountContext);

  const [file, setFile] = useState();

  // alert popup
  const [open, setOpen] = useState(false);
  const handleClose = () => {
    setOpen(false);
  };

  const onUploadClick = () => {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('company_id', accountContext.ID);
      uploadJobsHandler(formData);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 bg-green-500 p-2 mb-3 rounded">
        <label className="text-nowrap flex gap-[5px]">
          Have multiple jobs to add? Upload it as a
          <Tooltip title="csv file should contain: job_title, job_type, job_description, job_location, job_salary, job_date (optional)">
            <p className="underline">csv file</p>
          </Tooltip>
        </label>
        <input type="file" accept=".csv" onChange={(event) => {setFile(event.target.files[0])}} />
      </div>

      {/* Add Job Button */}
      <div>
        <button
          className="bg-website-blue hover:bg-website-gold text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline"
          onClick={onUploadClick}
        >
          Upload
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
    </>
  )
}

export default UploadCSV

/* 
===============================================================================
API
===============================================================================
*/
const uploadJobsHandler = async (formData) => {
  const res = await fetch('/api/job/upload', {
    method: 'POST',
    body: formData
  });
}