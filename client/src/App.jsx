import { Route, createBrowserRouter, createRoutesFromElements, RouterProvider } from "react-router-dom";
import HomePage from "./pages/HomePage";
import MainLayout from "./layouts/MainLayout";
import NotFoundPage from "./pages/NotFoundPage";
import JobPage from "./pages/JobPage";
import EditJobPage from "./pages/EditJobPage";
import CompaniesPage from "./pages/CompaniesPage";
import DashboardPage from "./pages/DashboardPage";
import JobsPage from "./pages/JobsPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import AddJobPage from "./pages/AddJobPage";
import CompanyJobsPage from "./pages/CompanyJobsPage";
import AppliedJobsPage from "./pages/AppliedJobsPage";
import { useState, useEffect, createContext } from "react";
import CompanyPage from "./pages/CompanyPage";

export const CompanysContext = createContext();
export const AccountContext = createContext();

function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={
          <ProtectedRoute validUser={'user and company'} redirectPath={'/login'}>
            <MainLayout />
          </ProtectedRoute>
        }>
          {/* All */}
          <Route index element={<HomePage />} />
          <Route path="/jobs/:id" element={<JobPage />} loader={jobLoader} /> {/* will wait for loader to finish before rendering JobPage */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/add-job" element={
            <CompanysProvider>
              <AddJobPage />
            </CompanysProvider>
          } />
          <Route path="/jobs/edit/:id" element={
            <CompanysProvider>
              <EditJobPage />
            </CompanysProvider>
          } loader={jobLoader} />
          {/* User Only */}
          <Route element={<ProtectedRoute validUser={'user'} redirectPath={'/'} />}>
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/applied-jobs" element={<AppliedJobsPage />} />
            <Route path="/companies" element={
              <CompanysProvider>
                <CompaniesPage />
              </CompanysProvider>
            } />
            <Route path="/companies/:id" element={<CompanyPage />} />
          </Route>
          {/* Company Only */}
          <Route element={<ProtectedRoute validUser={'company'} redirectPath={'/'} />}>
            <Route path="/company-jobs" element={<CompanyJobsPage />} />
          </Route>
          {/* Not Found Page */}
          <Route path="/*" element={<NotFoundPage />} />
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
===============================================================================
Context
===============================================================================
*/

const CompanysProvider = ({ children }) => {
  const [companys, setCompanys] = useState();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/company?is_custom=0');
        const data = await res.json();
        console.log(data)
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
  const [isCompany, setIsCompany] = useState(parseInt(sessionStorage.getItem("is_company")));
  const [ID, setID] = useState(parseInt(sessionStorage.getItem(`${isCompany ? 'company' : 'user'}_id`)));

  console.log("accountProvider");
  useEffect(() => {
    console.log("accountProvider useEffect");
  }, []);

  return (
    <AccountContext.Provider value={{ ID, isCompany, setID, setIsCompany }}>
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
    const res = await fetch(`/api/job/${params.id}`);
    const job = await res.json();
    return job;
  } catch (error) {
    console.log('Error fetching data from backend', error);
  }
}

export default App