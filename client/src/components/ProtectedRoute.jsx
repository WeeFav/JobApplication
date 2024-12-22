import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AccountContext } from "../App";
import { useContext } from "react";

const ProtectedRoute = ({ children }) => {
  const accountContext = useContext(AccountContext);
  const navigate = useNavigate();
  
  console.log("ProtectedRoute");
  useEffect(() => {
    if (isNaN(accountContext.accountID)) {
      navigate('/login', { replace: true });
    }
    console.log("ProtectedRoute useEffect");
  }, []);

  return children;
}

export default ProtectedRoute;