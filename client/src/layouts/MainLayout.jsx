import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Outlet />
      <footer>
        <Footer />
      </footer>
    </div>

  );
};

export default MainLayout;