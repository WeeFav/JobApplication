import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginPage({addUserHander, checkUserHandler}) {
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem("id") !== null) {
      navigate('/');
    }
  }, []);  

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState('applicant');
  const [accountStatus, setAccountStatus] = useState('exist');

  const onSubmitFormClick = async (e) => {
    e.preventDefault();

    const user = {
      email,
      password,
      accountType
    };

    if (accountStatus === 'new') {
      const {message} = await addUserHander(user);
      if (message === 'ER_DUP_ENTRY') {
        alert('email already exist');
      }
      setAccountStatus('exist');
      return navigate('/login');
    }

    if (accountStatus === 'exist') {
      const user_id = await checkUserHandler(user);
      if (user_id) {
        sessionStorage.setItem("id", user_id);
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
          <form className="space-y-4" onSubmit={onSubmitFormClick}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-website-blue focus:border-website-blue sm:text-sm"
                placeholder="Enter your email"
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
