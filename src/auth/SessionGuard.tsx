// src/auth/SessionGuard.tsx
import { useEffect, Fragment } from "react";
import useAuth from "./useAuth";

interface SessionGuardProps {
  children: React.ReactNode;
}

export default function SessionGuard({ children }: SessionGuardProps) {
  const { auth, checkLogin } = useAuth();

  useEffect(() => {
    if (!auth) {
      checkLogin(true); // dispara login apenas se não houver sessão
    }
  }, [auth, checkLogin]);

  return <Fragment>{children}</Fragment>;
}
