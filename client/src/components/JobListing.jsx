import { useState } from "react";
import { FaMapMarker } from 'react-icons/fa';
import { Link } from "react-router-dom";

const JobListing = ({ job }) => {
  const [showFullDescription, setShowFullDescription] = useState(false);

  let description = job.description;

  if (!showFullDescription) {
    description = description.substring(0, 90) + '...';
  }

  return (
    <>
      <div className="rounded-xl shadow-md relative border-t-4 border-l-4 border-r-4  border-website-lightGray">
        <div className="p-4">
          <div className="mb-6">
            <div className="text-gray-600 my-2">{job.type}</div>
            <h3 className="text-xl font-bold">{job.title}</h3>
          </div>

          <div className="mb-5">
            {description}
            <button
              onClick={() => setShowFullDescription((prevState) => !prevState)}
              className="text-website-blue mb-5 hover:underline ml-1">
              {showFullDescription ? 'Less' : 'More'}
            </button>
          </div>

          <h3 className="text-website-blue mb-2">{job.salary} / Year</h3>



        </div>
        {/* <div className="border border-gray-100 mb-5"></div> */}
        <div className="bg-website-lightGray flex flex-col lg:flex-row justify-between py-2 px-4 rounded-br rounded-bl">
          <div className="flex text-orange-700 items-center">
            <FaMapMarker className="inline text-lg mr-1" />
            {job.location}
          </div>
          <Link
            to={`/jobs/${job.id}`}
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