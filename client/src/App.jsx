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
import DevPage from "./pages/DevPage";
import JobsPage from "./pages/JobsPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { useState, useEffect, createContext } from "react";
export const CompanysContext = createContext();
export const JobsContext = createContext();

function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route path="/login" element={<LoginPage addUserHander={addUserHander} checkUserHandler={checkUserHandler} />} />
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={
            <JobsProvider>
              <HomePage />
            </JobsProvider>
          } />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/applied-jobs" element={
            <JobsProvider>
              <AppliedJobsPage searchJobHandler={searchJobHandler} />
            </JobsProvider>
          } />
          <Route path="/jobs/:id" element={<JobPage deleteJobHandler={deleteJobHandler} />} loader={jobLoader} /> {/* will wait for loader to finish before rendering JobPage */}
          <Route path="/jobs/edit/:id" element={
            <CompanysProvider>
              <EditJobPage updateJobHandler={updateJobHandler} />
            </CompanysProvider>
          } loader={jobLoader} />
          <Route path="/add-job" element={
            <CompanysProvider>
              <AddCustomJobPage addJobHandler={addJobHandler} />
            </CompanysProvider>
          } />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/dev" element={<DevPage />} />
        </Route>
      </>
    )
  );

  return (
    <RouterProvider router={router} />
  )
};

/*
-----------------------------------------------------------
API Handler
-----------------------------------------------------------
*/

// function to add job
const addJobHandler = async (newJob) => {
  const res = await fetch('/api/add-job', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(newJob)
  });
};

// function to delete job
const deleteJobHandler = async (id) => {
  await fetch(`/api/jobs/${id}`, {
    method: 'DELETE'
  });
};

// function to update job
const updateJobHandler = async (updatedJob) => {
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

// function to add user account
const addUserHander = async (user) => {
  const res = await fetch('/api/user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(user)
  });

  return await res.json();
};

// function to check user account
const checkUserHandler = async (user) => {
  const res = await fetch('/api/check-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(user)
  });
  const {user_id} = await res.json();
  if (user_id === 'failed') {
    return false;
  }

  return user_id;
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