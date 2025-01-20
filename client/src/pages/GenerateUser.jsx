import { useState } from "react";
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

const GenerateUser = () => {
  const [location, setLocation] = useState('us');
  const [education, setEducation] = useState('engr');
  const [years, setYears] = useState('entry');

  // alert popup
  const [open, setOpen] = useState(false);
  const handleClose = () => {
    setOpen(false);
  };

  const onSubmitFormClick = async (e) => {
    e.preventDefault();

    const option = {
      location: location,
      education: education,
      years: years
    }

    await generateUserHandler(option);
    setOpen(true);
  }

  return (
    <>
      <section className="bg-website-lightGray">
        <div className="container m-auto max-w-2xl py-24">
          <div className="bg-white px-6 py-8 mb-4 shadow-md rounded-md border m-4 md:m-0">
            <h2 className="text-3xl text-center font-semibold mb-6">Generate User</h2>
            <form onSubmit={onSubmitFormClick}>
              {/* Location */}
              <div className="mb-4">
                <label htmlFor="type" className="block text-gray-700 font-bold mb-2">
                  Location
                </label>
                <select
                  className="border rounded w-full py-2 px-3"
                  required
                  onChange={(e) => setLocation(e.target.value)}
                >
                  <option value="us">US</option>
                  <option value="global">Global</option>
                </select>
              </div>
              {/* Education */}
              <div className="mb-4">
                <label htmlFor="type" className="block text-gray-700 font-bold mb-2">
                  Education
                </label>
                <select
                  className="border rounded w-full py-2 px-3"
                  required
                  onChange={(e) => setEducation(e.target.value)}
                >
                  <option value="engr">Engineering, Sciences</option>
                  <option value="bus">Business</option>
                  <option value="ahss">Arts, Humanities, Social Sciences</option>
                  <option value="any">Any</option>
                </select>
              </div>
              {/* Work Experience Years */}
              <div className="mb-4">
                <label htmlFor="type" className="block text-gray-700 font-bold mb-2">
                  Work Experience Years
                </label>
                <select
                  className="border rounded w-full py-2 px-3"
                  required
                  onChange={(e) => setYears(e.target.value)}
                >
                  <option value="entry">entry: 0</option>
                  <option value="mid">mid: 1~5</option>
                  <option value="high">high:5~20</option>
                  <option value="any">Any</option>
                </select>
              </div>

              {/* Add Job Button */}
              <div>
                <button
                  className="bg-website-blue hover:bg-website-gold text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline"
                  type="submit"
                >
                  Generate User
                </button>
                <Snackbar open={open} autoHideDuration={3000} onClose={handleClose} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                  <Alert
                    onClose={handleClose}
                    severity="success"
                    variant="filled"
                    sx={{ width: '100%' }}
                  >
                    Succesfully generate user
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

export default GenerateUser

/* 
===============================================================================
API
===============================================================================
*/

// function to add job
const generateUserHandler = async (option) => {
  const res = await fetch('/api/user/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(option)
  });
  await res.json();
};