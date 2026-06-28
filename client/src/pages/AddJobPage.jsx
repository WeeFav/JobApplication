import { useState, useEffect, useContext } from "react"
import { useNavigate } from "react-router-dom";
import JobForm from "../components/AddJob/JobForm";
import UrlForm from "../components/AddJob/UrlForm";
import ScrapeForm from "../components/AddJob/ScrapeForm";

const AddJobPage = () => {
  const [tab, setTab] = useState('url');

  return (
    <>
      <section className="bg-website-lightGray">
        <div className="container m-auto max-w-2xl py-24">
          <div className="bg-white px-6 py-8 mb-4 shadow-md rounded-md border m-4 md:m-0">
            <h2 className="text-3xl text-center font-semibold mb-6">Add Job</h2>

            {/* single job form or upload */}
            <div className="flex w-full space-x-4 mb-5">
              <button
                type="button"
                className={`w-1/3 px-4 py-2 rounded ${tab === 'url' ? 'bg-website-blue text-white' : 'bg-gray-100 text-black'
                  } hover:bg-website-blue hover:text-white`}
                onClick={() => setTab('url')}>
                From URL
              </button>
              <button
                type="button"
                className={`w-1/3 px-4 py-2 rounded ${tab === 'manual' ? 'bg-website-blue text-white' : 'bg-gray-100 text-black'
                  } hover:bg-website-blue hover:text-white`}
                onClick={() => setTab('manual')}>
                Manual
              </button>
              <button
                type="button"
                className={`w-1/3 px-4 py-2 rounded ${tab === 'scrape' ? 'bg-website-blue text-white' : 'bg-gray-100 text-black'
                  } hover:bg-website-blue hover:text-white`}
                onClick={() => setTab('scrape')}>
                Scrape
              </button>
            </div>

            {tab === 'url' ? (
              <UrlForm />
            ) : tab === 'manual' ? (
              <JobForm />
            ) : (
              <ScrapeForm />
            )}

          </div>
        </div>
      </section>
    </>
  )
}

export default AddJobPage
