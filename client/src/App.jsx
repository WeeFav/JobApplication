import { Route, createBrowserRouter, createRoutesFromElements, RouterProvider, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import NotFoundPage from "./pages/NotFoundPage";
import EditJobPage from "./pages/EditJobPage";
import DashboardPage from "./pages/DashboardPage";
import JobsPage from "./pages/JobsPage";
import ProfilePage from "./pages/ProfilePage";
import AddJobPage from "./pages/AddJobPage";
import AppliedJobsPage from "./pages/AppliedJobsPage";
import ScrapePage from "./pages/ScrapePage";
import RecommendedJobsPage from "./pages/RecommendedJobsPage";
import { useState, useEffect, createContext } from "react";

export const CompanysContext = createContext();
export const AccountContext = createContext();

function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route path="/" element={
            <MainLayout />
        }>  
          <Route path="/" element={<Navigate to="/jobs" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/add-job" element={<AddJobPage />} />
          <Route path="/jobs/edit/:id" element={<EditJobPage />} loader={jobLoader} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/applied-jobs" element={<AppliedJobsPage />} />
          <Route path="/recommended-jobs" element={<RecommendedJobsPage />} />
          <Route path="/scrape" element={<ScrapePage />} />
          <Route path="/*" element={<NotFoundPage />} />
        </Route>
      </>
    )
  );

  return (
    <RouterProvider router={router} />
  )
};

/*
===============================================================================
Context
===============================================================================
*/



/*
-----------------------------------------------------------
Loaders
-----------------------------------------------------------
*/
const jobLoader = async ({ params }) => {
  try {
    const res = await fetch(`/server_api/jobs/${params.id}`);
    const job = await res.json();
    return job;
  } catch (error) {
    console.log('Error fetching data from backend', error);
  }
}

export default App