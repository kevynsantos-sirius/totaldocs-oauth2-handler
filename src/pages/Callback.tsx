import useAuth from "../auth/useAuth";
import { useEffect, useState } from "react";

export default function Callback() {
  const { handleCallback } = useAuth();
  const [loading, setLoading] = useState<boolean>(true); // Estado de loading para controle

  useEffect(() => {
    const storedAuth = localStorage.getItem("auth");

    if (storedAuth) {
      // Já autenticado, redireciona para a página principal
      setLoading(false);
      const lastPath = localStorage.getItem("lastPath") || "/";
      window.location.replace(lastPath); // Redireciona para a última página ou à raiz
      return;
    }

    // Se não estiver autenticado, realiza o processo de login
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      handleCallback(code).then(() => {
        localStorage.removeItem("lastPath"); // Remove a rota salva após o login
        window.history.replaceState({}, document.title, window.location.pathname);
        setLoading(false); // Finaliza o loading após o login
      }).catch((error) => {
        console.error("Falha na autenticação:", error);
        setLoading(false); // Finaliza o loading em caso de erro
        window.location.replace("/"); // Redireciona para a página inicial em caso de falha
      });
    } else {
      console.error("Callback sem código OAuth2!");
      setLoading(false);
      window.location.replace("/"); // Redireciona para a página inicial caso não tenha o código
    }
  }, [handleCallback]);

  // Exibe uma tela de loading enquanto o processo de autenticação é feito
  if (loading) {
    return (
      <div>
        <h1>Autenticando...</h1>
        <p>Estamos verificando sua autenticação, por favor aguarde.</p>
      </div>
    );
  }

  return null; // Não renderiza nada quando o processo for concluído
}
