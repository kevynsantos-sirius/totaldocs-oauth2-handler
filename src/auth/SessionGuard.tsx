import { useEffect } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import useAuth from "./useAuth.js";

interface SessionGuardProps {
  children: ReactNode;
}

export default function SessionGuard({ children }: SessionGuardProps) {
  const location = useLocation();
  const { checkLogin } = useAuth();

  useEffect(() => {
    console.log("Rota acessada:", location.pathname);
    checkLogin(true); // força checagem de login sempre que a rota mudar
  }, [location.pathname, checkLogin]);

  return <>{children}</>;
}
