import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/footer";

const MainLayout = () => {
  return (
    <>
      <Navbar />
      <Outlet />
      <section className="mt-8">
        <Footer />
      </section>
    </>
  );
};

export default MainLayout;