import { useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../auth/useAuth";

interface RootRedirectProps {
  pageComponent: ReactNode;
  main: string;
}

export default function RootRedirect({ pageComponent, main }: RootRedirectProps) {
  const { checkLogin } = useAuth();
  const navigate = useNavigate();
  const [hasAuth, setHasAuth] = useState<boolean>(() => !!localStorage.getItem("auth"));

  useEffect(() => {
    if (!hasAuth) {
      checkLogin(true);
      // ou navega direto:
      navigate(main);
    }
  }, [hasAuth, checkLogin, navigate, main]);

  return hasAuth ? (
    <>{pageComponent}</>
  ) : (
    <div>
      <h1>Sessão expirada</h1>
      <p>Redirecionando novamente para entrar.</p>
    </div>
  );
}
