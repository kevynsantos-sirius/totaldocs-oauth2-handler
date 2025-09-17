import { useEffect, useState, ReactNode } from "react";
import useAuth from "../auth/useAuth";

interface RootRedirectProps {
  pageComponent: ReactNode;
  main: string;
}

export default function RootRedirect({ pageComponent, main }: RootRedirectProps) {
  const { checkLogin } = useAuth();
  const [loading, setLoading] = useState<boolean>(false); // Para controlar o estado de loading
  const [hasAuth, setHasAuth] = useState<boolean>(false); // Inicializando como false

  useEffect(() => {
    const storedAuth = localStorage.getItem("auth");
    if (storedAuth) {
      setHasAuth(true); // Se já tiver auth, não precisa verificar
    }
    else
    {
       // Caso não tenha auth, disparar o login
      if (!loading) {
        setLoading(true); // Marca que estamos aguardando o login
        const doRedirect = async () => {
          await checkLogin(true); // Dispara o login
          const storedAuthAfterCheck = localStorage.getItem("auth");
          setHasAuth(!!storedAuthAfterCheck); // Atualiza o estado de autenticação após a verificação
          setLoading(false); // Finaliza o loading
        };
        doRedirect();
      }
    }
  }, [loading, checkLogin]);

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
