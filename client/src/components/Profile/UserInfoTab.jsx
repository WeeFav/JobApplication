import { useState } from "react"

const UserInfoTab = ({ profileInfo }) => {
  const [edit, setEdit] = useState(false)
  const [userLocation, setUserLocation] = useState(profileInfo.user_location)
  const [userEducation, setUserEducation] = useState(profileInfo.user_education)
  const [userSkills, setUserSkills] = useState(profileInfo.user_skills ? profileInfo.user_skills : [])
  const [userSkillInput, setUserSkillInput] = useState("");
  const [userExYears, setUserExYears] = useState(profileInfo.user_experience_years)
  const [userExRoles, setUserExRoles] = useState(profileInfo.user_experience_roles ? profileInfo.user_experience_roles : [])
  const [userExRoleInput, setUserExRoleInput] = useState("");

  const handleRemoveSkill = (skillToRemove) => {
    setUserSkills(userSkills.filter((skill) => skill !== skillToRemove));
  };
  const handleRemoveRole = (roleToRemove) => {
    setUserExRoles(userExRoles.filter((role) => role !== roleToRemove));
  };

  const handleSkillKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const trimmedValue = userSkillInput.trim();
      if (trimmedValue && !userSkills.includes(trimmedValue)) {
        setUserSkills([...userSkills, trimmedValue]);
      }
      setUserSkillInput("");
    }
  };

  const handleRoleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const trimmedValue = userExRoleInput.trim();
      if (trimmedValue && !userExRoles.includes(trimmedValue)) {
        setUserExRoles([...userExRoles, trimmedValue]);
      }
      setUserExRoleInput("");
    }
  };

  const onSubmitFormClick = () => {
    const updatedUser = {
      company_id: profileInfo.company_id,
      company_description: companyDescription,
      company_phone: companyPhone,
    }
    updateUserHandler(updatedUser)
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 w-[400px]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">User Information</h3>
        <button
          className="text-gray-400 hover:text-gray-600"
          onClick={() => { setEdit((prevState) => !prevState) }}>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit
          </span>
        </button>
      </div>
      {!edit ?
        <div>
          <div>
            <label className="block text-sm text-gray-500">User Location</label>
            <div className="mt-1 text-gray-700">{userLocation}</div>
          </div>
          <div>
            <label className="block text-sm text-gray-500">User Education</label>
            <div className="mt-1 text-gray-700">{userEducation}</div>
          </div>
          <div>
            <label className="block text-sm text-gray-500">User Skills</label>
            <div className="mt-1 text-gray-700">{userSkills}</div>
          </div>
          <div>
            <label className="block text-sm text-gray-500">User Work Experience Years</label>
            <div className="mt-1 text-gray-700">{userExYears}</div>
          </div>
          <div>
            <label className="block text-sm text-gray-500">User Work Experience Roles</label>
            <div className="mt-1 text-gray-700">{userExRoles}</div>
          </div>
        </div>
        :
        <form onSubmit={onSubmitFormClick}>
          {/* user locaition */}
          <div>
            <label className="block text-sm text-gray-500">User Location</label>
            <input
              type="text"
              className="border rounded w-full py-2 px-3 mb-2"
              required
              value={userLocation}
              onChange={(e) => setUserLocation(e.target.value)}
            />
          </div>

          {/* user education */}
          <div>
            <label className="block text-sm text-gray-500">User Education</label>
            <input
              type="text"
              className="border rounded w-full py-2 px-3 mb-2"
              required
              value={userEducation}
              onChange={(e) => setUserEducation(e.target.value)}
            />
          </div>

          {/* user skills */}
          <div>
            <label className="block text-sm text-gray-500">User Skills</label>
            <div className="flex flex-wrap items-center border border-gray-300 rounded-lg p-2 space-x-1">
              {userSkills.map((skill, index) => (
                <div key={index} className="flex items-center bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm mb-2">
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="ml-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    &times;
                  </button>
                </div>
              ))}
              <input
                type="text"
                value={userSkillInput}
                onChange={(e) => setUserSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown}
                placeholder="Add a skill"
                className="flex-1 outline-none border-none p-1 text-sm focus:ring-0"
              />
            </div>
          </div>

          {/* user work years */}
          <div>
            <label className="block text-sm text-gray-500">User Work Experience Years</label>
            <input
              type="text"
              className="border rounded w-full py-2 px-3 mb-2"
              required
              value={userExYears}
              onChange={(e) => {
                const filteredValue = e.target.value.replace(/\D/, '')
                setUserExYears(filteredValue)
              }}
            />
          </div>

          {/* user work companies */}
          <div>
            <label className="block text-sm text-gray-500">User Work Experience Roles</label>
            <div className="flex flex-wrap items-center border border-gray-300 rounded-lg p-2 space-x-1">
              {userExRoles.map((role, index) => (
                <div key={index} className="flex items-center bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm mb-2">
                  {role}
                  <button
                    type="button"
                    onClick={() => handleRemoveRole(role)}
                    className="ml-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    &times;
                  </button>
                </div>
              ))}
              <input
                type="text"
                value={userExRoleInput}
                onChange={(e) => setUserExRoleInput(e.target.value)}
                onKeyDown={handleRoleKeyDown}
                placeholder="Add a role"
                className="flex-1 outline-none border-none p-1 text-sm focus:ring-0"
              />
            </div>
          </div>

          {/* make change button */}
          <div className="flex justify-center">
            <button
              className="bg-website-blue hover:bg-website-gold text-white py-1 px-4 rounded-full mt-2"
              type="submit">
              Make Change
            </button>
          </div>

        </form>
      }
    </div>
  )
}

export default UserInfoTab

/* 
===============================================================================
API
===============================================================================
*/

// function to update user
const updateUserHandler = async (updatedUser) => {
  const res = await fetch('/api/user', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updatedUser)
  });
};