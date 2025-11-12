import { useState, useEffect } from "react";
import profilePic from '../../assets/images/logo.png';

const MyProfileTab = () => {
  const [loading, setLoading] = useState(true);
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [edit, setEdit] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      const user = await loadUserProfile();
      setFirstname(user.first_name);
      setLastname(user.last_name);
      setEmail(user.email);
      setLoading(false);
    };
    fetchUser();
  }, []);

  const onSubmitFormClick = async (e) => {
    e.preventDefault();

    const filename = !accountContext.isCompany ? `user${profileInfo.user_id}.png` : `company${profileInfo.company_id}.png`

    if (!accountContext.isCompany) {
      // User
      const updatedUser = {
        user_id: profileInfo.user_id,
        user_name: name,
        user_email: email,
        user_image: image ? `/api/images/${filename}` : profileInfo.user_image
      }

      const updatedAccount = {
        account_id: profileInfo.user_id,
        account_email: email
      }

      await updateUserHandler(updatedUser, updatedAccount);
      window.location.reload();
    }
    else {
      // Company
      const updatedCompany = {
        company_id: profileInfo.company_id,
        company_name: name,
        company_email: email,
        company_image: image ? `/api/images/${filename}` : profileInfo.company_image
      }

      const updatedAccount = {
        account_id: profileInfo.account_id,
        account_email: email
      }

      updateCompanyHandler(updatedCompany, updatedAccount)
    }

    // save uploaded image to backend
    if (image) {
      const formData = new FormData();
      formData.append("customFilename", filename);
      formData.append("image", image);

      saveImageHandler(formData);
    }
  }

  return (
    <>
      {loading ? <></> :
        <div className="bg-white p-6 rounded-lg border border-gray-200 w-[400px]" >
          {!edit ?
            <div className="flex">
              <img
                src={profilePic}
                alt="Profile"
                className="object-contain w-16 h-16 rounded-full mr-4"
              />
              <div className="w-full">
                <div className="flex w-full items-center mb-1 justify-between">
                  <h2 className="text-lg font-semibold">{firstname + " " + lastname}</h2>
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
                <div className="flex flex-col gap-1">
                  <p className="text-gray-500">Email: {email}</p>
                </div>
              </div>
            </div>
            :
            <form className="flex" onSubmit={onSubmitFormClick}>
              <img
                src={profilePic}
                alt="Profile"
                className="object-contain w-16 h-16 rounded-full mr-4"
              />
              <div>
                <div className="flex items-center gap-[10px] mb-1">
                  <input
                    type="text"
                    id="firstname"
                    name="firstname"
                    className="border rounded w-full py-2 px-3 mb-2 text-lg font-semibold"
                    required
                    value={firstname}
                    onChange={(e) => setFirstname(e.target.value)}
                  />

                  <input
                    type="text"
                    id="lastname"
                    name="lastname"
                    className="border rounded w-full py-2 px-3 mb-2 text-lg font-semibold"
                    required
                    value={lastname}
                    onChange={(e) => setLastname(e.target.value)}
                  />

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

                <div className="flex flex-col gap-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-gray-500">Email: </p>
                    <input
                      type="text"
                      id="email"
                      name="email"
                      className="border rounded w-full py-2 px-3 mb-2"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    className="bg-website-blue hover:bg-website-gold text-white py-1 px-4 rounded-full mt-2"
                    type="submit">
                    Make Change
                  </button>
                </div>

              </div>
            </form>
          }
        </div >
      }
    </>
  )
}

export default MyProfileTab

/* 
===============================================================================
API
===============================================================================
*/

// function to load user profile
const loadUserProfile = async () => {
  try {
    const res = await fetch(`/api/user`);
    const user = await res.json();
    return user;
  } catch (error) {
    console.log("Error fetching data from backend", error);
  }
};

// function to update user
const updateUserHandler = async (updatedUser, updatedAccount) => {
  let res = await fetch('/api/user', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updatedUser)
  });

  res = await fetch('/api/account', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updatedAccount)
  });
};

// function to update company
const updateCompanyHandler = async (updatedCompany, updatedAccount) => {
  let res = await fetch('/api/company', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updatedCompany)
  });

  res = await fetch('/api/account', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updatedAccount)
  });
};