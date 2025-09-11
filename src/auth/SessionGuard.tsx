import { useEffect } from "react";
import useAuth from "./useAuth";
import { Fragment } from "react";


interface SessionGuardProps {
  children: React.ReactNode;
  location: any; // Location do react-router-dom
  navigate: any; // Navigate function do react-router-dom
}

export default function SessionGuard({ children, location, navigate }: SessionGuardProps) {
  const { checkLogin } = useAuth();

  // Aqui usamos os props location/navigate, não hooks
  useEffect(() => {
    console.log("Rota acessada:", location.pathname);
    checkLogin(true);
  }, [location.pathname, checkLogin]);

  return <Fragment>{children}</Fragment>;
}

