import React, { useEffect, useState } from "react";
import { Route, createBrowserRouter, createRoutesFromElements, RouterProvider } from "react-router-dom";
import HomePage from "./pages/HomePage";
import MainLayout from "./layouts/MainLayout";
import JobsPage from "./pages/JobsPage";
import NotFoundPage from "./pages/NotFoundPage";

function App() {
  const [backendData, setBackendData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api");
      const data = await res.json();
      setBackendData(data);
    }
    
    fetchData();
  }, [])
  
  // Handle case where data is not yet loaded
  if (!backendData) {
    return <div>Loading...</div>; // Optional loading state
  }

  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage jobData={backendData}/>} />
        <Route path="/jobs" element={<JobsPage jobData={backendData}/>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    )
  );

  return (
    <RouterProvider router={router} />
  )
}

export default App