import { useState, useEffect } from "react"

const ResumeTab = () => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(1);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    setLoading(true);
    loadResumes(setResumes, setLoading);
  }, []);

  const onAddClick = () => {
    const newId = resumes.at(-1).id + 1;
    setResumes([...resumes, { id: newId, name: `New Resume`, text: "" }]);
    setActiveId(newId);
  };

  const onDeleteClick = (id) => {
    const filtered = resumes.filter((r) => r.id !== id);
    setResumes(filtered);
    if (filtered.length > 0) {
      setActiveId(filtered.at(-1).id);
    }
  };

  const onSaveClick = () => {
    updateResumes(resumes);
  }

  const updateName = (id, newName) => {
    setResumes(
      resumes.map((r) =>
        r.id === id ? { ...r, name: newName } : r
      )
    );
  };

  const updateContent = (id, newContent) => {
    setResumes(
      resumes.map((r) =>
        r.id === id ? { ...r, text: newContent } : r
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
            onClick={() => {
              // Only switch tab if NOT in edit mode
              if (editId !== resume.id) {
                setActiveId(resume.id);
              }
            }}
            onDoubleClick={() => {
              setEditId(resume.id); // Enter edit mode
            }}
          >
            {editId === resume.id ? (
              <input
                className="font-medium bg-white border rounded px-1 w-24"
                value={resume.name}
                autoFocus
                onChange={(e) => updateName(resume.id, e.target.value)}
                onBlur={() => setEditId(null)} // Exit edit on blur
                onKeyDown={(e) => {
                  if (e.key === "Enter") setEditId(null);
                }}
                onClick={(e) => e.stopPropagation()} // Prevent tab switch while editing
              />
            ) : (
              <span className="font-medium">{resume.name}</span>
            )}

            {resumes.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteClick(resume.id);
                }}
                className="text-gray-500 hover:text-red-500"
              >
                <p>X</p>
              </button>
            )}
          </div>
        ))}
        <button
          onClick={onAddClick}
          className="flex items-center space-x-1 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
        >
          <p>+</p>
          <span>Add</span>
        </button>
        <button
          onClick={onSaveClick}
          className="flex items-center space-x-1 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
        >
          <span>Save</span>
        </button>
      </div>

      {/* Resume Editor */}
      {activeResume && (
        <div className="bg-white rounded-lg border border-gray-300">
          <textarea
            className="w-full h-[70vh] rounded-md p-3 resize-none focus:outline-none"
            placeholder="Enter your resume here..."
            value={activeResume.text}
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
const loadResumes = async (setResumes, setLoading) => {
  const res = await fetch('/api/resumes');
  const data = await res.json();
  setResumes(data);
  setLoading(false);
};

const updateResumes = async (resumes) => {
  const res = await fetch('/api/resumes', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(resumes)
  });

  const message_json = await res.json();
  return { success: res.ok, message: message_json.message }
};

