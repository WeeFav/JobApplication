import logo from "../assets/images/logo.png"
import { NavLink } from "react-router-dom";

const Navbar = () => {
  const linkClass = ({ isActive }) => `text-white rounded-md px-2 py-2 ${isActive ? 'bg-website-gold' : 'hover:bg-website-gold'}`;

  return (
    <nav className="bg-website-blue">
      <div className="px-2 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <div className="flex flex-1 items-center justify-center md:items-stretch md:justify-start">
            <NavLink className="bg-website-gold flex flex-shrink-0 items-center" to="/">
              <span className="hidden md:block text-white text-2xl font-bold ml-2 mr-2">Job Application</span>
            </NavLink>
            <div className="md:ml-auto">
              <div className="flex space-x-2">
                <NavLink to="/" className={linkClass}>
                  Home
                </NavLink>
                <NavLink to="/jobs" className={linkClass}>
                  Jobs
                </NavLink>
                <NavLink to="/companies" className={linkClass}>
                  Companies
                </NavLink>
                <NavLink to="/applied-jobs" className={linkClass}>
                  Applied Jobs
                </NavLink>
                <NavLink to="/add-job" className={linkClass}>
                  Add Custom Job
                </NavLink>
                <NavLink to="/dashboard" className={linkClass}>
                  Dashboard
                </NavLink>
                <NavLink to="/profile" className={linkClass}>
                  Profile
                </NavLink>
                <NavLink to="/dev" className={linkClass}>
                  Dev
                </NavLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;