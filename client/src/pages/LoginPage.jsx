import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { addAccountHandler, checkAccountHandler } from '../App';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { UserContext } from "../App";
import { useContext } from "react";

function LoginPage() {
  const userContext = useContext(UserContext);
  const navigate = useNavigate();

  // first check if user already logged in
  // if logged in, redirect to home page
  useEffect(() => {
    if (!isNaN(userContext.userID)) {
      navigate('/');
    }
  }, []);

  console.log("LoginPage");
  useEffect(() => {
    console.log("LoginPage useEffect");
  }, []);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState('applicant');
  const [accountStatus, setAccountStatus] = useState('exist');

  // alert popup
  const [open, setOpen] = useState(false);
  const handleClose = () => {
    setOpen(false);
  };

  const onSubmitFormClick = async (e) => {
    e.preventDefault();

    const account = {
      name,
      email,
      password,
      accountType
    };

    if (accountStatus === 'new') {
      const account_id = await addAccountHandler(account);
      if (account_id === 'ER_DUP_ENTRY') {
        alert('email already exist');
      }
      else {
        setOpen(true);
      }

      setAccountStatus('exist');
      return navigate('/login');
    }

    if (accountStatus === 'exist') {
      const user_db = await checkAccountHandler(user);
      if (user_db) {
        sessionStorage.setItem("user_id", user_db.user_id);
        sessionStorage.setItem("user_email", user_db.user_email);
        sessionStorage.setItem("is_company", user_db.is_company);
        sessionStorage.setItem("is_registered", user_db.is_registered);
        userContext.setUserID(user_db.user_id);
        userContext.setUserEmail(user_db.user_email);
        userContext.setIsCompany(user_db.is_company);
        userContext.setIsRegistered(user_db.is_registered);
        return navigate('/');
      }
      else {
        alert("Incorrect email and password");
      }
    }
  };

  return (
    <div className="bg-website-blue h-screen w-screen flex items-center justify-center">
      <div className="flex flex-col w-full max-w-md">
        <div className="flex flex-row">
          <div className={`w-[calc(20%)] rounded-t-lg p-3 ${accountType === 'applicant' ? 'bg-white text-website-blue' : 'bg-gray-300 text-gray-700'
            }`}>
            <button onClick={() => setAccountType('applicant')}>
              Applicant
            </button>
          </div>
          <div className={`w-[calc(20%)] rounded-t-lg p-3 ${accountType === 'company' ? 'bg-white text-website-blue' : 'bg-gray-300 text-gray-700'
            }`}>
            <button onClick={() => setAccountType('company')}>
              Company
            </button>
          </div>
        </div>
        <div className="bg-white p-8 rounded-b-lg rounded-tr-lg shadow-md">
          <form className="space-y-3" onSubmit={onSubmitFormClick}>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {accountType === 'applicant' ? 'Name' : 'Company Name'}
              </label>
              <input
                type="text"
                id="name"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-website-blue focus:border-website-blue sm:text-sm"
                placeholder={`Enter your ${accountType === 'applicant' ? 'name' : 'company name'}`}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-website-blue focus:border-website-blue sm:text-sm"
                placeholder="Enter your email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                id="password"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-website-blue focus:border-website-blue sm:text-sm"
                placeholder="Enter your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-website-blue text-white font-medium rounded-md shadow hover:bg-website-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-website-blue"
              >
                {accountType === 'applicant' ?
                  accountStatus === 'exist' ? 'Login as applicant' : 'Create account as applicant'
                  :
                  accountStatus === 'exist' ? 'Login as company' : 'Create account as company'
                }
              </button>
              <Snackbar open={open} autoHideDuration={3000} onClose={handleClose} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                <Alert
                  onClose={handleClose}
                  severity="success"
                  variant="filled"
                  sx={{ width: '100%' }}
                >
                  Succesfully created account
                </Alert>
              </Snackbar>
            </div>
          </form>
          {accountStatus === 'exist' ?
            <p className="mt-4 text-sm text-gray-600 text-center">
              Don't have an account?
              <button className="ml-1 text-website-blue font-medium hover:underline"
                onClick={() => setAccountStatus('new')}>
                Sign up
              </button>
            </p>
            :
            <p className="mt-4 text-sm text-gray-600 text-center">
              Already have an account?
              <button className="ml-1 text-website-blue font-medium hover:underline"
                onClick={() => setAccountStatus('exist')}>
                Log in
              </button>
            </p>
          }
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
