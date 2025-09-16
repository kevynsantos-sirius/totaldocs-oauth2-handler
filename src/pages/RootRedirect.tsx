// src/pages/RootRedirect.tsx
import { useEffect, ReactNode } from "react";
import useAuth from "../auth/useAuth";

interface RootRedirectProps {
  /** Componente a ser renderizado se o usuário estiver autenticado */
  pageComponent: ReactNode;
  /** Rota padrão para onde redirecionar após login */
  main: string;
}

export default function RootRedirect({ pageComponent }: RootRedirectProps) {
  const { auth, checkLogin } = useAuth();

  useEffect(() => {
    if (!auth) {
       checkLogin(true);
    }
  }, [auth, checkLogin]);

  if (auth) {
    // Se autenticado, retorna o componente passado
    return <>{pageComponent}</>;
  } else {
    // Se não autenticado, retorna uma mensagem de erro
    return (
      <div>
        <h1>Sessão expirada</h1>
        <p>Redirecionando novamente para entrar.</p>
      </div>
    );
  }
}
