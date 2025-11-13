import { useState, useEffect } from "react"

const ResumeTab = () => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(1);

  useEffect(() => {
    setLoading(true);
    loadResumes(setResumes, setLoading);
  }, []);

  const addResume = () => {
    const newId = Date.now();
    setResumes([...resumes, { id: newId, name: `Resume ${resumes.length + 1}`, content: "" }]);
    setActiveId(newId);
  };

  const deleteResume = (id) => {
    const filtered = resumes.filter((r) => r.id !== id);
    setResumes(filtered);
    if (filtered.length > 0) {
      setActiveId(filtered[0].id);
    }
  };

  const updateContent = (id, newContent) => {
    setResumes(
      resumes.map((r) =>
        r.id === id ? { ...r, content: newContent } : r
      )
    );
  };

  const activeResume = resumes.find((r) => r.id === activeId);

  return (
    <div className="bg-white rounded-lg w-[800px]">
      {/* Tabs Header */}
      <div className="flex items-center space-x-2 overflow-x-auto">
        {resumes.map((resume) => (
          <div
            key={resume.id}
            className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg cursor-pointer transition-colors ${activeId === resume.id
                ? "bg-white border-b-2 border-blue-500 shadow-sm"
                : "bg-gray-200 hover:bg-gray-300"
              }`}
            onClick={() => setActiveId(resume.id)}
          >
            <span className="font-medium">{resume.name}</span>
            {resumes.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteResume(resume.id);
                }}
                className="text-gray-500 hover:text-red-500"
              >
                <p>X</p>
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addResume}
          className="flex items-center space-x-1 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
        >
          <p>+</p>
          <span>Add</span>
        </button>
      </div>

      {/* Resume Editor */}
      {activeResume && (
        <div className="bg-white rounded-lg border border-gray-300">
          <textarea
            className="w-full h-[70vh] rounded-md p-3 resize-none focus:outline-none"
            placeholder="Enter your resume here..."
            value={activeResume.content}
            onChange={(e) => updateContent(activeId, e.target.value)}
          />
        </div>
      )}
    </div>
  )
}

export default ResumeTab

/* 
===============================================================================
API
===============================================================================
*/

// function to update user
const loadResumes = async (setResumes, setLoading) => {
  const res = await fetch('/api/resumes');
  const data = await res.json();
  setResumes(data);
  setLoading(false);
};