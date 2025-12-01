import { useState, useEffect, useRef } from "react"
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

const ResumeTab = () => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(1);
  const [editId, setEditId] = useState(null);
  const [savedSnapshot, setSavedSnapshot] = useState([]);
  const wsRef = useRef(null);
  // alert popup
  const [open, setOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('success');

  useEffect(() => {
    setLoading(true);
    loadResumes(setResumes, setLoading, setSavedSnapshot, setActiveId);
  }, []);

  const onAddClick = () => {
    let newId;
    if (resumes.length == 0) {
      newId = 0;
    }
    else {
      newId = resumes.at(-1).id + 1;
    }
    setResumes([...resumes, { id: newId, name: `New Resume`, content: "" }]);
    setActiveId(newId);
  };

  const onDeleteClick = (id) => {
    const filtered = resumes.filter((r) => r.id !== id);
    setResumes(filtered);
    if (filtered.length > 0) {
      setActiveId(filtered.at(-1).id);
    }
  };

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
        r.id === id ? { ...r, content: newContent } : r
      )
    );
  };

  const detectUpdatedResumes = (current, snapshot) => {
    return current.map(r => {
      const old = snapshot.find(s => s.id === r.id);
  
      // New resume → mark as updated
      if (!old) {
        return { ...r, isUpdated: true };
      }
  
      // Content changed → mark as updated
      if (old.content !== r.content) {
        return { ...r, isUpdated: true };
      }
  
      // No change → keep isUpdate as false
      return { ...r, isUpdated: false };
    });
  };

  const onSaveClick = async () => {
    const updatedResumes = detectUpdatedResumes(resumes, savedSnapshot);
    
    const success = await updateResumes(updatedResumes, wsRef);

    if (success) {
      setAlertSeverity('success');
      setAlertMessage('Succesfully update resume');
    }
    else {
      setAlertSeverity('error');
      setAlertMessage('Fail to update resume');
    }

    setOpen(true);
  }

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
            value={activeResume.content}
            onChange={(e) => updateContent(activeId, e.target.value)}
          />
        </div>
      )}

      <Snackbar open={open} autoHideDuration={3000} onClose={() => setOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert
          onClose={() => setOpen(false)}
          severity={alertSeverity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {alertMessage}
        </Alert>
      </Snackbar>

    </div>
  )
}

export default ResumeTab

/* 
===============================================================================
API
===============================================================================
*/
const loadResumes = async (setResumes, setLoading, setSavedSnapshot, setActiveId) => {
  const res = await fetch('/api/resumes');
  const data = await res.json();
  setResumes(data);
  setActiveId(data[0].id);
  setSavedSnapshot(data);
  setLoading(false);
};

const updateResumes = async (updatedResumes, wsRef) => {
  // Create socket
  const ws = new WebSocket('ws://localhost:8080/resumes');
  wsRef.current = ws;
  let success;

  ws.onopen = () => {
    console.log('Connected to WebSocket');
    ws.send(JSON.stringify(updatedResumes));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "insert") {
      if (msg.start) {
        console.log("start insert");
      }      
      else if (msg.success) {
        console.log("insert success");
        success = true;
      }
      else {
        console.log("insert failed");
        success = false;
      }
    }
    else if (msg.type === "recommend") {
      if (msg.start) {
        console.log("start recommend");
      }      
      else if (msg.success) {
        console.log("recommend success");
        success = true;
      }
      else {
        console.log("recommend failed");
        success = false;
      }
    }
  };

  ws.onclose = () => {
    console.log('Socket closed');
    wsRef.current = null;
  };

  return success;
};

