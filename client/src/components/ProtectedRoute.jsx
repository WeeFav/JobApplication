import { useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { AccountContext } from "../App";
import { useContext } from "react";

const ProtectedRoute = ({ validUser, redirectPath, children }) => {
  const accountContext = useContext(AccountContext);
  const navigate = useNavigate();
  
  console.log("ProtectedRoute");

  useEffect(() => {
    if (validUser === 'user and company') {
      if (isNaN(accountContext.ID)) {
        return navigate(redirectPath, { replace: true });
      }
    }
    else if (validUser === 'user') {
      if (accountContext.isCompany) {
        return navigate(redirectPath, { replace: true });
      }
    }
    else if (validUser === 'company') {
      if (!accountContext.isCompany) {
        return navigate(redirectPath, { replace: true });
      }
    }
    else if (validUser === 'admin') {
      if (!(!accountContext.isCompany && accountContext.ID === 0)) {
        return navigate(redirectPath, { replace: true });
      }
    }
    console.log("ProtectedRoute useEffect");
  }, []);

  return children ? children : <Outlet />;
}

export default ProtectedRoute;