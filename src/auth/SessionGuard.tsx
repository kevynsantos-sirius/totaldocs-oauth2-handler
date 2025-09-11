import { useEffect } from "react";
import type { ReactNode } from "react";
import useAuth from "./useAuth";
import type { Location } from "react-router-dom";

interface SessionGuardProps {
  children: ReactNode;
  location: Location;
}

export default function SessionGuard({ children, location }: SessionGuardProps) {
  const { checkLogin } = useAuth();

  useEffect(() => {
    console.log("Rota acessada:", location.pathname);
    checkLogin(true); // força checagem de login sempre que a rota mudar
  }, [location.pathname, checkLogin]);

  return <>{children}</>;
}
