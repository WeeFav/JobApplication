import { Route, createBrowserRouter, createRoutesFromElements, RouterProvider } from "react-router-dom";
import HomePage from "./pages/HomePage";
import MainLayout from "./layouts/MainLayout";
import JobsPage from "./pages/JobsPage";
import NotFoundPage from "./pages/NotFoundPage";
import JobPage, {jobLoader} from "./pages/JobPage";
import AddJobPage from "./pages/AddJobPage";

function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:id" element={<JobPage />} loader={jobLoader} /> {/* will wait for loader to finish before rendering JobPage */}
        <Route path="/add-job" element={<AddJobPage />} loader={jobLoader} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    )
  );

  return (
    <RouterProvider router={router} />
  )
}

export default App