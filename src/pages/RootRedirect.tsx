import { useEffect, useRef } from "react";
import useAuth from "../auth/useAuth";

interface RootRedirectProps {
  main: string;
}

export default function RootRedirect({ main }: RootRedirectProps) {
  const { auth, checkLogin } = useAuth();
  const ran = useRef(false); // evita rodar mais de uma vez

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (auth) {
      const lastPath = localStorage.getItem("lastPath") || main;
      localStorage.removeItem("lastPath");
      window.location.replace(lastPath);
    } else {
      checkLogin(true);
    }
  }, [auth, checkLogin, main]);

  return null;
}
