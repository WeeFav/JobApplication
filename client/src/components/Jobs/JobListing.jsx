import { useState } from "react";
import { FaMapMarker } from 'react-icons/fa';
import { Link } from "react-router-dom";

const JobListing = ({ job }) => {
  const [showFullDescription, setShowFullDescription] = useState(false);

  let description = job.job_description;

  if (!showFullDescription) {
    description = description.substring(0, 90) + '...';
  }

  return (
    <>
      <div className="rounded-xl shadow-md relative border-t-4 border-l-4 border-r-4 border-website-lightGray mb-auto">
        <div className="p-4">
          <div className="mb-6">
            <div className="text-gray-600 my-2">{job.job_type}</div>
            <h3 className="text-xl font-bold">{job.job_title}</h3>
          </div>

          <div className="mb-5 whitespace-pre-wrap">
            {description}
            <button
              onClick={() => setShowFullDescription((prevState) => !prevState)}
              className="text-website-blue mb-5 hover:underline ml-1">
              {showFullDescription ? 'Less' : 'More'}
            </button>
          </div>

          <h3 className="text-website-blue mb-2">{job.job_salary} / Year</h3>



        </div>
        <div className="bg-website-lightGray flex flex-col lg:flex-row justify-between py-2 px-4 rounded-br rounded-bl">
          <div className="flex text-orange-700 items-center">
            <FaMapMarker className="inline text-lg mr-1" />
            {job.job_location}
          </div>
          <Link
            to={`/jobs/${job.job_id}`}
            className="h-[36px] bg-website-blue text-white px-4 py-2 rounded-lg text-center text-sm"
          >
            Read More
          </Link>
        </div>
      </div>
    </>
  );
};

export default JobListing;