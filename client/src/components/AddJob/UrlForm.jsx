import { useState, useContext } from "react"
import { useNavigate } from "react-router-dom"
import { ProgressContext } from "../../context/ProgressContext"

const UrlForm = () => {
  const [url, setUrl] = useState('');
  const { addJobByUrl } = useContext(ProgressContext);
  const navigate = useNavigate();

  const onSubmitFormClick = (e) => {
    e.preventDefault();
    if (url.trim()) {
      addJobByUrl(url.trim());
      setUrl('');
      navigate('/dashboard');
    }
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
            placeholder="e.g. https://www.linkedin.com/jobs/view/..."
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
        </div>
      </form>
    </>
  )
}

export default UrlForm
