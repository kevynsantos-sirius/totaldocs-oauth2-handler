// src/auth/SessionGuard.tsx
import { useEffect, Fragment } from "react";
import useAuth from "./useAuth";

interface SessionGuardProps {
  children: React.ReactNode;
}

export default function SessionGuard({ children }: SessionGuardProps) {
  const { checkLogin } = useAuth();

useEffect(() => {
  const storedAuth = localStorage.getItem("auth");
  if (!storedAuth) checkLogin(true);
}, [checkLogin]);


  return <Fragment>{children}</Fragment>;
}
