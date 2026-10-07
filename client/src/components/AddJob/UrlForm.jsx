import { useState, useContext } from "react"
import { useNavigate } from "react-router-dom"
import { ProgressContext } from "../../context/ProgressContext"

const UrlForm = () => {
  const [url, setUrl] = useState('');
  const [source, setSource] = useState('linkedin');
  const { addJobByUrl } = useContext(ProgressContext);
  const navigate = useNavigate();

  const onSubmitFormClick = (e) => {
    e.preventDefault();
    if (url.trim()) {
      addJobByUrl(url.trim(), source);
      setUrl('');
      navigate('/dashboard');
    }
  };

  return (
    <>
      <form onSubmit={onSubmitFormClick}>
        <div className="mb-4">
          <label htmlFor="url" className="block text-gray-700 font-bold mb-2">
            URL
          </label>
          <input
            type="text"
            id="url"
            name="url"
            className="border rounded w-full py-2 px-3 mb-2"
            placeholder="e.g. https://boards.greenhouse.io/... or https://jobs.lever.co/..."
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="source" className="block text-gray-700 font-bold mb-2">
            Source
          </label>
          <select
            id="source"
            name="source"
            className="border rounded w-full py-2 px-3 mb-2 bg-white"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="linkedin">LinkedIn</option>
            <option value="github">GitHub</option>
            <option value="jobright">Jobright</option>
            <option value="ats">ATS</option>
            <option value="other">Other</option>
          </select>
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
  );
};

export default UrlForm
