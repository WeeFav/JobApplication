const JobSearchBar = () => {
  return (
    <div className="flex flex-row gap-4">
      {/* Job Title Input */}
      <div className="flex-grow">
        <label htmlFor="job-title" className="block text-sm font-medium text-gray-700 mb-1">
          Job Title
        </label>
        <input
          id="job-title"
          type="text"
          placeholder="e.g., Software Engineer"
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-website-blue"
        />
      </div>

      {/* Location Input */}
      <div className="flex-grow">
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
          Location
        </label>
        <input
          id="location"
          type="text"
          placeholder="e.g., New York"
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-website-blue"
        />
      </div>

      {/* Type Input */}
      <div className="flex-grow">
        <label htmlFor="job-type" className="block text-sm font-medium text-gray-700 mb-1">
          Job Type
        </label>
        <input
          id="job-type"
          type="text"
          placeholder="e.g., Full-time"
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-website-blue"
        />
      </div>

      {/* Search Button */}
      <button
        className="bg-blue-500 text-white rounded hover:bg-blue-600 transition duration-200 mt-6 px-4"
      >
        Search
      </button>
    </div>
  );
}

export default JobSearchBar