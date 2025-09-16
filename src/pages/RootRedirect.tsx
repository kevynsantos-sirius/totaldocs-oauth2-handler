import { useEffect, useState, ReactNode } from "react";
import useAuth from "../auth/useAuth";

interface RootRedirectProps {
  pageComponent: ReactNode;
  main: string;
}

export default function RootRedirect({ pageComponent, main }: RootRedirectProps) {
  const { checkLogin } = useAuth();
  const [hasAuth, setHasAuth] = useState<boolean>(() => !!localStorage.getItem("auth"));

  useEffect(() => {
    if (!hasAuth) {
      // cria uma função async interna
      const doRedirect = async () => {
        await checkLogin(true);
        window.location.href = main;
      };
      doRedirect();
    }
  }, [hasAuth, checkLogin, main]);

  return hasAuth ? (
    <>{pageComponent}</>
  ) : (
    <div>
      <h1>Sessão expirada</h1>
      <p>Redirecionando novamente para entrar.</p>
    </div>
  );
}
