// src/pages/RootRedirect.tsx
import { useEffect } from "react";
import useAuth from "../auth/useAuth";

interface RootRedirectProps {
  /** rota padrão para onde redirecionar após login */
  main: string;
}

export default function RootRedirect({ main }: RootRedirectProps) {
  const { auth, checkLogin, showIframe } = useAuth();

  useEffect(() => {
    if (auth) {
      // já autenticado → redireciona para rota principal
      const lastPath = main;
      window.location.replace(lastPath);
      showIframe(false);
    } else {
      // sem sessão → dispara login automático
      checkLogin(true);
    }
  }, [auth, checkLogin, main]);

  return null;
}
