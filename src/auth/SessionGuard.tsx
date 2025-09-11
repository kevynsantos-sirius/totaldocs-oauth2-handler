import { useEffect, Fragment } from "react";
import useAuth from "./useAuth";

interface SessionGuardProps {
  children: React.ReactNode;
}

export default function SessionGuard({ children }: SessionGuardProps) {
  const { checkLogin } = useAuth();

  useEffect(() => {
    // Sempre que o componente montar, registra a rota atual no localStorage
    checkLogin(true);
  }, [checkLogin]);

  return <Fragment>{children}</Fragment>;
}
