import { AccountContext } from "../App";
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserProfile from "../components/Profile/UserProfile";
import CompanyProfile from "../components/Profile/CompanyProfile";

const ProfilePage = () => {
  const navigate = useNavigate();
  const accountContext = useContext(AccountContext);
  const [profileInfo, setProfileInfo] = useState();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accountContext.isCompany) {
      loadCompanyProfile(accountContext.ID, setProfileInfo, setLoading);
    }
    else {
      loadUserProfile(accountContext.ID, setProfileInfo, setLoading);
    }
  }, [])

  return (
    // <div className="bg-website-blue flex flex-auto flex-col items-center justify-center">
    //   <div className="max-w-4xl mt-auto p-6 bg-white shadow-md rounded-lg">
    //     {/* Profile Header */}
    //     <div className="flex items-center space-x-4">
    //       <img className="object-cover h-24 w-24" src={accountContext.isCompany ? `https://www.svgrepo.com/show/490660/company.svg` : `https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png`} alt="Profile Picture" />
    //       <div>
    //         <h2 className="text-2xl font-bold text-gray-900">{accountContext.accountEmail}</h2>
    //         <p className="text-gray-600">{accountContext.isCompany ? "Company" : "Applicant"}</p>
    //       </div>
    //     </div>

    //     {/* Bio Section */}
    //     <div className="mt-6">
    //       <h3 className="text-lg font-semibold text-gray-900">Bio</h3>
    //       <p className="mt-2 text-gray-600">
    //         {`Account ID : ${accountContext.accountID}`}
    //       </p>
    //     </div>

    //     {/* Contact Info */}
    //     {/* <div className="mt-6">
    //       <h3 className="text-lg font-semibold text-gray-900">Contact Info</h3>
    //       <p className="mt-2 text-gray-600">Email: john.doe@example.com</p>
    //       <p className="text-gray-600">Phone: +123 456 7890</p>
    //       <p className="text-gray-600">Location: New York, USA</p>
    //     </div> */}

    //     {/* Social Links */}
    //     {/* <div className="mt-6">
    //       <h3 className="text-lg font-semibold text-gray-900">Follow Me</h3>
    //       <div className="flex space-x-4 mt-2">
    //         <a href="#" className="text-blue-500 hover:text-blue-700">
    //           <i className="fab fa-facebook-f"></i> Facebook
    //         </a>
    //         <a href="#" className="text-blue-400 hover:text-blue-600">
    //           <i className="fab fa-twitter"></i> Twitter
    //         </a>
    //         <a href="#" className="text-blue-600 hover:text-blue-800">
    //           <i className="fab fa-linkedin-in"></i> LinkedIn
    //         </a>
    //       </div>
    //     </div> */}

    //     {/* About Me */}
    //     {/* <div className="mt-6">
    //       <h3 className="text-lg font-semibold text-gray-900">About Me</h3>
    //       <p className="mt-2 text-gray-600">
    //         I am a passionate developer with experience in building web applications using modern technologies like React, Tailwind CSS, Node.js, and more.
    //       </p>
    //     </div> */}
    //   </div>
    //   <button 
    //   className="bg-website-gold hover:bg-website-darkGold text-white font-bold py-2 px-4 rounded mb-auto mt-5"
    //   onClick={() => {
    //     sessionStorage.clear();
    //     accountContext.setAccountID(NaN);
    //     accountContext.setAccountEmail(null);
    //     accountContext.setIsCompany(NaN);
    //     navigate('/login')
    //   }}>
    //     Log out
    //   </button>
    // </div>
    <>
      {loading ?
        <div>loading</div>
        :
        <div className="bg-website-blue flex flex-auto flex-col items-center justify-center">
          {accountContext.isCompany ?
            <CompanyProfile profileInfo={profileInfo} />
            :
            <UserProfile profileInfo={profileInfo} />
          }
        </div>
      }
    </>
  )
}

export default ProfilePage

/* 
===============================================================================
API
===============================================================================
*/

// function to load user profile
const loadUserProfile = async (user_id, setProfileInfo, setLoading) => {
  try {
    const res = await fetch(`/api/user/${user_id}`);
    const data = await res.json();
    setProfileInfo(data);
  } catch (error) {
    console.log("Error fetching data from backend", error);
  } finally {
    setLoading(false);
  }
};

// function to load company profile
const loadCompanyProfile = async (company_id, setProfileInfo, setLoading) => {
  try {
    const res = await fetch(`/api/company/${company_id}`);
    const data = await res.json();
    setProfileInfo(data);
  } catch (error) {
    console.log("Error fetching data from backend", error);
  } finally {
    setLoading(false);
  }
};
