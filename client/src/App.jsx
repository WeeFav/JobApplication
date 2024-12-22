import { Route, createBrowserRouter, createRoutesFromElements, RouterProvider } from "react-router-dom";
import HomePage from "./pages/HomePage";
import MainLayout from "./layouts/MainLayout";
import AppliedJobsPage from "./pages/AppliedJobsPage";
import NotFoundPage from "./pages/NotFoundPage";
import JobPage from "./pages/JobPage";
import AddCustomJobPage from "./pages/AddCustomJobPage";
import EditJobPage from "./pages/EditJobPage";
import CompaniesPage from "./pages/CompaniesPage";
import DashboardPage from "./pages/DashboardPage";
import JobsPage from "./pages/JobsPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { useState, useEffect, createContext } from "react";
import RegisterCompanyPage from "./pages/RegisterCompanyPage";

export const CompanysContext = createContext();
export const JobsContext = createContext();
export const AccountContext = createContext();

function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterCompanyPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={
            <JobsProvider>
              <HomePage />
            </JobsProvider>
          } />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/applied-jobs" element={
            <JobsProvider>
              <AppliedJobsPage />
            </JobsProvider>
          } />
          <Route path="/jobs/:id" element={<JobPage />} loader={jobLoader} /> {/* will wait for loader to finish before rendering JobPage */}
          <Route path="/jobs/edit/:id" element={
            <CompanysProvider>
              <EditJobPage />
            </CompanysProvider>
          } loader={jobLoader} />
          <Route path="/add-job" element={
            <CompanysProvider>
              <AddCustomJobPage />
            </CompanysProvider>
          } />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </>
    )
  );

  return (
    <AccountProvider>
      <RouterProvider router={router} />
    </AccountProvider>
  )
};

/*
-----------------------------------------------------------
API Handler
-----------------------------------------------------------
*/

// function to add job
export const addJobHandler = async (newJob) => {
  const res = await fetch('/api/add-job', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(newJob)
  });
};

// function to delete job
export const deleteJobHandler = async (id) => {
  await fetch(`/api/jobs/${id}`, {
    method: 'DELETE'
  });
};

// function to update job
export const updateJobHandler = async (updatedJob) => {
  const res = await fetch(`/api/jobs/${updatedJob.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updatedJob)
  });
};

// function to search job
export const searchJobHandler = async (jobTitle, jobLocation, jobType) => {
  const res = await fetch(`/api/jobs?jobTitle=${jobTitle}&jobLocation=${jobLocation}&jobType=${jobType}`);
  const data = await res.json();
  return data;
};

// function to add account
export const addAccountHandler = async (account) => {
  // add new account
  let res = await fetch('/api/account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(account)
  });

  // return if account email exist
  const { account_id } = await res.json()
  if (account_id === 'ER_DUP_ENTRY') {
    return account_id;
  }
  
  // add new user or company
  if (account.accountType === 'applicant') {
    const user = {
      user_name: account.name,
      account_id: account_id
    }
    
    res = await fetch('/api/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(user)
    });
  }
  else {
    const company = {
      company_name: account.name,
      company_description: '',
      company_email: account.email,
      company_phone: '',
      is_custom: false,
      account_id: account_id
    }
    
    res = await fetch('/api/company', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(company)
    });
  }
};

// function to check user account
export const checkAccountHandler = async (account) => {
  const res = await fetch('/api/account/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(account)
  });

  const account_db = await res.json();

  if (account_db.account_id === 'failed') {
    return false;
  }

  return account_db;
}

/*
-----------------------------------------------------------
Context
-----------------------------------------------------------
*/
const JobsProvider = ({ children }) => {
  const [jobs, setjobs] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/jobs');
        const data = await res.json();
        setjobs(data);
      } catch (error) {
        console.log("Error fetching data from backend", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);


  return (
    <JobsContext.Provider value={{ jobs, loading }}>
      {children}
    </JobsContext.Provider>
  );
};


const CompanysProvider = ({ children }) => {
  const [companys, setCompanys] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/companys');
        const data = await res.json();
        setCompanys(data);
      } catch (error) {
        console.log("Error fetching data from backend", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <CompanysContext.Provider value={{ companys, loading }}>
      {children}
    </CompanysContext.Provider>
  );
};

const AccountProvider = ({ children }) => {
  const [accountID, setAccountID] = useState(parseInt(sessionStorage.getItem("account_id")));
  const [accountEmail, setAccountEmail] = useState(sessionStorage.getItem("account_email"));
  const [isCompany, setIsCompany] = useState(parseInt(sessionStorage.getItem("is_company")));

  console.log("accountProvider");
  useEffect(() => {
    console.log("accountProvider useEffect");
  }, []);

  return (
    <AccountContext.Provider value={{ accountID, accountEmail, isCompany, setAccountID, setAccountEmail, setIsCompany }}>
      {children}
    </AccountContext.Provider>
  );
};

/*
-----------------------------------------------------------
Loaders
-----------------------------------------------------------
*/
const jobLoader = async ({ params }) => {
  try {
    const res = await fetch(`/api/jobs/${params.id}`);
    const job = await res.json();
    return job;
  } catch (error) {
    console.log('Error fetching data from backend', error);
  }
}

export default App