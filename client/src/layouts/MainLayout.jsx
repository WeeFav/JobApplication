import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Outlet />
      <section>
        <Footer />
      </section>
    </div>
    
  );
};

export default MainLayout;