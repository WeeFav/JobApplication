import { useState, useContext, useEffect } from "react";
import { AccountContext } from "../../App";

const MyProfileTab = ({ profileInfo }) => {
  const accountContext = useContext(AccountContext);

  const [edit, setEdit] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!accountContext.isCompany) {
      // User
      setName(profileInfo.user_name);
      setEmail(profileInfo.user_email);
      setPreview(profileInfo.user_image);
    }
    else {
      // Company
      setName(profileInfo.company_name);
      setEmail(profileInfo.company_email);
      setPreview(profileInfo.company_image);
    }
  }, [])

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const onSubmitFormClick = () => {
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

      updateUserHandler(updatedUser, updatedAccount)
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
    <div className="bg-white p-6 rounded-lg border border-gray-200 w-[400px]" >
      {!edit ?
        <div className="flex">
          <img
            src={!accountContext.isCompany ? profileInfo.user_image : profileInfo.company_image}
            alt="Profile"
            className="object-contain w-16 h-16 rounded-full mr-4"
          />
          <div className="w-full">
            <div className="flex w-full items-center mb-1 justify-between">
              <h2 className="text-lg font-semibold">{name}</h2>
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
              <p className="text-gray-500">{!accountContext.isCompany ? "User" : "Company"}</p>
              <p className="text-gray-500">Email: {email}</p>
              {!accountContext.isCompany ?
                <p className="text-gray-500">User ID: {profileInfo.user_id}</p>
                :
                <p className="text-gray-500">Company ID: {profileInfo.company_id}</p>
              }
            </div>
          </div>
        </div>
        :
        <form className="flex" onSubmit={onSubmitFormClick}>
          <label htmlFor="image-upload">
            <img src={preview} alt="Upload" className="object-contain w-16 h-16 rounded-full mr-4 cursor-pointer" />
          </label>
          <input id="image-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageChange} />
          <div>
            <div className="flex items-center gap-[10px] mb-1">
              <input
                type="text"
                id="name"
                name="name"
                className="border rounded w-full py-2 px-3 mb-2 text-lg font-semibold"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
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
              <p className="text-gray-500">{!accountContext.isCompany ? "User" : "Company"}</p>
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
              {!accountContext.isCompany ?
                <p className="text-gray-500">User ID: {profileInfo.user_id}</p>
                :
                <p className="text-gray-500">Company ID: {profileInfo.company_id}</p>
              }            </div>
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
  )
}

export default MyProfileTab

/* 
===============================================================================
API
===============================================================================
*/

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

// function to save image
const saveImageHandler = async (formData) => {
  const res = await fetch('/api/save-image', {
    method: 'POST',
    body: formData
  });
}