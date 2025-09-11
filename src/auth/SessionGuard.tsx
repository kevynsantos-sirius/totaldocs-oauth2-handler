import { useEffect, Fragment } from "react";
import useAuth from "./useAuth";
import { useLocation, useNavigate } from "react-router-dom";

interface SessionGuardProps {
  children: React.ReactNode;
  location?: any; // optional
  navigate?: any; // optional
}

export default function SessionGuard({ children, location, navigate }: SessionGuardProps) {
  const routerLocation = location ?? useLocation();
  const routerNavigate = navigate ?? useNavigate();
  const { checkLogin } = useAuth();

  useEffect(() => {
    console.log("Rota acessada:", routerLocation.pathname);
    checkLogin(true); // força checagem de login sempre que a rota mudar
  }, [routerLocation.pathname, checkLogin]);

  return <Fragment>{children}</Fragment>;
}
