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
import AddJobPage from "./pages/AddJobPage";
import CompanyJobsPage from "./pages/CompanyJobsPage";
import { useState, useEffect, createContext } from "react";

export const CompanysContext = createContext();
export const AccountContext = createContext();

function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={
            <HomePage />
          } />
          <Route path="/company-jobs" element={<CompanyJobsPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/applied-jobs" element={
            <AppliedJobsPage />
          } />
          <Route path="/jobs/:id" element={<JobPage />} loader={jobLoader} /> {/* will wait for loader to finish before rendering JobPage */}
          <Route path="/jobs/edit/:id" element={
            <CompanysProvider>
              <EditJobPage />
            </CompanysProvider>
          } loader={jobLoader} />
          <Route path="/add-job" element={
            <AddJobPage />
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

/*
-----------------------------------------------------------
Context
-----------------------------------------------------------
*/


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
  const [isCompany, setIsCompany] = useState(parseInt(sessionStorage.getItem("is_company")));

  console.log("accountProvider");
  useEffect(() => {
    console.log("accountProvider useEffect");
  }, []);

  return (
    <AccountContext.Provider value={{ accountID, isCompany, setAccountID, setIsCompany }}>
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