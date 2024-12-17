import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/footer";

const MainLayout = () => {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
    </>
  );
};

export default MainLayout;