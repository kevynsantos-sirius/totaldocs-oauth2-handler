// src/pages/RootRedirect.tsx
import { useEffect } from "react";
import useAuth from "../auth/useAuth";

interface RootRedirectProps {
  /** rota padrão para onde redirecionar após login */
  main: string;
}

export default function RootRedirect({ main }: RootRedirectProps) {
  const { auth, checkLogin } = useAuth();

  useEffect(() => {
    if (auth) {
      // já autenticado → redireciona para rota principal
      const lastPath = localStorage.getItem("lastPath") || main;
      localStorage.removeItem("lastPath");
      window.location.replace(lastPath);
    } else {
      // sem sessão → dispara login automático
      checkLogin(true);
    }
  }, [auth, checkLogin, main]);

  return null;
}
