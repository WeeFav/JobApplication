import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ScrollToTop from "../components/ScrollToTop";

const MainLayout = () => {
  const location = useLocation();
  const isJobPage = location.pathname.startsWith("/jobs");

  return (
    <div className={`flex flex-col h-screen`}>
      <ScrollToTop />
      <Navbar />
      <Outlet />
      <footer>
        <Footer />
      </footer>
    </div>
  );
};

export default MainLayout;