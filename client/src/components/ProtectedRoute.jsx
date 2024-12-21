import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from "../App";
import { useContext } from "react";

const ProtectedRoute = ({ children }) => {
  const userContext = useContext(UserContext);
  const navigate = useNavigate();
  
  console.log("ProtectedRoute");
  useEffect(() => {
    if (isNaN(userContext.userID)) {
      navigate('/login', { replace: true });
    }
    console.log("ProtectedRoute useEffect");
  }, []);

  return children;
}

export default ProtectedRoute;