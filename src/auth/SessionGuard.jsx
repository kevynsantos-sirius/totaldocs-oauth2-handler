// SessionGuard.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

const SessionGuard = ({ children }) => {
  const location = useLocation();
  const { checkLogin } = useAuth();

  useEffect(() => {
    // Executa sempre que a rota mudar
    console.log("Rota acessada:", location.pathname);
    
    checkLogin(true);
  }, [location.pathname, checkLogin]);

  return children;
};

export default SessionGuard;
