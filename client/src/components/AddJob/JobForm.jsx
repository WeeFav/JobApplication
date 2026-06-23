import { useState, useContext } from "react"
import { useNavigate } from "react-router-dom"
import { ProgressContext } from "../../context/ProgressContext"

const JobForm = () => {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const { addJobManually } = useContext(ProgressContext);
  const navigate = useNavigate();
  
  const onSubmitFormClick = (e) => {
    e.preventDefault();

    const newJob = {
      title,
      company,
      description,
      url,
      location,
      post_date: date
    };

    addJobManually(newJob);

    // Reset fields
    setTitle('');
    setDescription('');
    setCompany('');
    setUrl('');
    setLocation('');
    setDate('');

    navigate('/dashboard');
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
            placeholder="eg. Software Engineer"
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
            placeholder="eg. Google"
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
            placeholder="eg. Mountain View, CA"
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
            placeholder="eg. https://www.google.com/careers/..."
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
        </div>
      </form>
    </>
  )
}

export default JobForm