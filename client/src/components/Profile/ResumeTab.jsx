import { useState, useEffect, useRef, useContext } from "react"
import { useNavigate } from "react-router-dom"
import { ProgressContext } from "../../context/ProgressContext"

const findSkillMatches = (text, skills) => {
  if (!text || !skills || skills.length === 0) return [];
  
  // Sort skills by length descending to match longest first
  const sortedSkills = [...skills]
    .filter(s => s && s.trim().length > 0)
    .sort((a, b) => b.length - a.length);
    
  const matches = [];
  const lowerText = text.toLowerCase();
  
  for (const skill of sortedSkills) {
    const lowerSkill = skill.toLowerCase();
    let index = lowerText.indexOf(lowerSkill);
    
    while (index !== -1) {
      const end = index + skill.length;
      
      // Boundary check: preceding and following characters should not be alphanumeric
      const precedingChar = index > 0 ? text[index - 1] : '';
      const followingChar = end < text.length ? text[end] : '';
      
      const isPrecedingBoundary = !/[a-zA-Z0-9]/.test(precedingChar);
      const isFollowingBoundary = !/[a-zA-Z0-9]/.test(followingChar);
      
      if (isPrecedingBoundary && isFollowingBoundary) {
        // Check overlap with existing matches
        const hasOverlap = matches.some(m => 
          (index >= m.start && index < m.end) || 
          (end > m.start && end <= m.end) || 
          (index <= m.start && end >= m.end)
        );
        
        if (!hasOverlap) {
          matches.push({
            start: index,
            end: end,
            skill: skill,
            matchedText: text.substring(index, end)
          });
        }
      }
      
      index = lowerText.indexOf(lowerSkill, index + 1);
    }
  }
  
  // Sort matches by start index ascending
  return matches.sort((a, b) => a.start - b.start);
};

const renderHighlightedContent = (text, matches) => {
  if (!text) return "";
  if (!matches || matches.length === 0) return text;
  
  const elements = [];
  let lastIndex = 0;
  
  matches.forEach((match, idx) => {
    // Add text before the match
    if (match.start > lastIndex) {
      elements.push(text.substring(lastIndex, match.start));
    }
    
    // Add the highlighted match
    elements.push(
      <span
        key={`match-${idx}`}
        className="inline-block border border-website-gold bg-amber-50 text-website-darkGold px-1 rounded mx-0.5 font-semibold shadow-sm hover:bg-amber-100 transition-colors"
        title={`Skill: ${match.skill}`}
      >
        {match.matchedText}
      </span>
    );
    
    lastIndex = match.end;
  });
  
  // Add remaining text
  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }
  
  return elements;
};

const ResumeTab = () => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(1);
  const [editId, setEditId] = useState(null);
  const [savedSnapshot, setSavedSnapshot] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  
  const { triggerResumeUpdate } = useContext(ProgressContext);
  const navigate = useNavigate();
  
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
    setResumes([...resumes, { id: newId, name: `New Resume`, content: "", rawSkills: [] }]);
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

  const normalizeNewlines = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/\r\n/g, '\n');
  };

  const detectUpdatedResumes = (current, snapshot) => {
    const results = current.map(r => {
      const old = snapshot.find(s => s.id === r.id);

      // New resume → count as content updated
      if (!old) {
        return { ...r, isContentUpdated: true, isNameUpdated: false };
      }

      const isNameUpdated = old.name !== r.name;
      const isContentUpdated = normalizeNewlines(old.content) !== normalizeNewlines(r.content);

      return {
        ...r,
        isNameUpdated,
        isContentUpdated
      };
    });

    // Filter out the ones with no change
    return results.filter(r => r.isNameUpdated || r.isContentUpdated);
  };

  const onSaveClick = async () => {
    const updatedResumes = detectUpdatedResumes(resumes, savedSnapshot);
    const isDeleted = resumes.length !== savedSnapshot.length;

    if (updatedResumes.length === 0 && !isDeleted) {
      console.log("No changes detected.");
      return;
    }

    const payload = {
      updated: updatedResumes,
      active_ids: resumes.map(r => r.id)
    };

    const changedNames = [];
    updatedResumes.forEach(r => changedNames.push(r.name));
    savedSnapshot.forEach(old => {
      if (!resumes.some(r => r.id === old.id)) {
        changedNames.push(`${old.name} (Deleted)`);
      }
    });

    triggerResumeUpdate(payload, changedNames);
    
    // Sync the snapshot with the saved state
    setSavedSnapshot(resumes.map(r => ({ ...r, isNameUpdated: false, isContentUpdated: false })));
    setIsEditing(false);
    navigate("/dashboard");
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
              ? "bg-white border-b-2 border-website-gold shadow-sm"
              : "bg-gray-200 hover:bg-gray-300"
              }`}
            onClick={() => {
              if (editId !== resume.id) {
                setActiveId(resume.id);
                setEditId(null);
              }
            }}
            onDoubleClick={() => {
              if (isEditing) {
                setEditId(resume.id); // Enter edit mode
              }
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

            {isEditing && resumes.length > 1 && (
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
          className="flex items-center space-x-1 px-3 py-2 bg-website-gold text-white rounded-md hover:bg-website-darkGold transition"
        >
          <p>+</p>
          <span>Add</span>
        </button>
        {isEditing && (
          <button
            onClick={onSaveClick}
            className="flex items-center space-x-1 px-3 py-2 bg-website-gold text-white rounded-md hover:bg-website-darkGold transition"
          >
            <span>Save</span>
          </button>
        )}
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center space-x-1 px-3 py-2 bg-website-gold text-white rounded-md hover:bg-website-darkGold transition"
        >
          <span>{isEditing ? "Preview" : "Edit"}</span>
        </button>
      </div>

      {/* Resume Editor */}
      {activeResume && (
        <div className="bg-white rounded-lg border border-gray-300">
          {isEditing ? (
            <textarea
              className="w-full h-[70vh] rounded-md p-3 resize-none focus:outline-none"
              placeholder="Enter your resume here..."
              value={activeResume.content}
              onChange={(e) => updateContent(activeId, e.target.value)}
            />
          ) : (
            <div
              className="w-full h-[70vh] rounded-md p-3 overflow-y-auto whitespace-pre-wrap text-left select-text"
            >
              {activeResume.content ? (
                renderHighlightedContent(
                  activeResume.content,
                  findSkillMatches(activeResume.content, activeResume.rawSkills)
                )
              ) : (
                <span className="text-gray-400">Enter your resume here...</span>
              )}
            </div>
          )}
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
const loadResumes = async (setResumes, setLoading, setSavedSnapshot, setActiveId) => {
  const res = await fetch('/server_api/resumes');
  const data = await res.json();
  
  // Normalize keys to camelCase
  const normalizedData = data.map(r => ({
    id: r.id,
    name: r.name,
    content: r.content,
    isUpdated: r.isupdated !== undefined ? r.isupdated : r.isUpdated,
    rawSkills: r.raw_skills || []
  }));
  
  setResumes(normalizedData);
  if (normalizedData.length > 0) {
    setActiveId(normalizedData[0].id);
  }
  setSavedSnapshot(JSON.parse(JSON.stringify(normalizedData)));
  setLoading(false);
};

