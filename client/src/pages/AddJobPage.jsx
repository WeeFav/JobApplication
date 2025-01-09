import { useState, useEffect, useContext } from "react"
import { useNavigate } from "react-router-dom";
import { AccountContext } from "../App";
import JobForm from "../components/AddJob/JobForm";
import UploadCSV from "../components/AddJob/UploadCSV";
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Tooltip from '@mui/material/Tooltip';

const AddJobPage = () => {
  const accountContext = useContext(AccountContext);

  const [tab, setTab] = useState('single');

  return (
    <>
      <section className="bg-website-lightGray">
        <div className="container m-auto max-w-2xl py-24">
          <div className="bg-white px-6 py-8 mb-4 shadow-md rounded-md border m-4 md:m-0">
            <h2 className="text-3xl text-center font-semibold mb-6">Add Job</h2>

            {/* single job form or upload */}
            {accountContext.isCompany ?
              <div className="flex w-full space-x-4 mb-5">
                <button
                  type="button"
                  className={`w-1/2 px-4 py-2 rounded ${tab === 'single' ? 'bg-website-blue text-white' : 'bg-gray-100 text-black'
                    } hover:bg-website-blue hover:text-white`}
                  onClick={() => setTab('single')}>
                  Single Job
                </button>
                <button
                  type="button"
                  className={`w-1/2 px-4 py-2 rounded ${tab === 'multiple' ? 'bg-website-blue text-white' : 'bg-gray-100 text-black'
                    } hover:bg-website-blue hover:text-white`}
                  onClick={() => setTab('multiple')}>
                  Upload CSV
                </button>
              </div>
              :
              <>
              </>
            }

            {tab === 'single' ?
              <JobForm />
              :
              <UploadCSV />
            }

          </div>
        </div>
      </section>
    </>
  )
}

export default AddJobPage
