import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const user = sessionStorage.getItem("user_id");

  useEffect(() => {
    if (user === null) {
      navigate('/login', { replace: true });
    }

  }, [navigate, user]);

  return children;
}

export default ProtectedRoute;