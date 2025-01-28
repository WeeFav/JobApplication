import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ScrollToTop from "../components/ScrollToTop";

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
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