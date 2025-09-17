import { useEffect, useState, ReactNode } from "react";
import useAuth from "../auth/useAuth";

interface RootRedirectProps {
  pageComponent: ReactNode;
  main: string;
}

export default function RootRedirect({ pageComponent, main }: RootRedirectProps) {
  const { checkLogin } = useAuth();
  const [hasAuth, setHasAuth] = useState<boolean>(() => !!localStorage.getItem("auth"));
  const [loading, setLoading] = useState<boolean>(false); // Para controlar o estado de loading

  useEffect(() => {
    if (!hasAuth && !loading) {
      setLoading(true); // Marca que estamos aguardando o login
      const doRedirect = async () => {
        await checkLogin(true); // Dispara o login
        setHasAuth(!!localStorage.getItem("auth")); // Atualiza o estado de autenticação após a verificação
        setLoading(false); // Finaliza o loading
      };
      doRedirect();
    }
  }, [hasAuth, loading, checkLogin]);

  // Se ainda estiver carregando, exibe o iframe (ou qualquer outro elemento de loading)
  if (loading) {
    return (
      <div>
        <h1>Autenticando...</h1>
        <p>Por favor, aguarde enquanto verificamos sua sessão.</p>
      </div>
    );
  }

  // Se autenticado, renderiza o componente da página
  return hasAuth ? (
    <>{pageComponent}</>
  ) : (
    <div>
      <h1>Sessão expirada</h1>
      <p>Redirecionando novamente para entrar.</p>
    </div>
  );
}
