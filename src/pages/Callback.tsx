import useAuth from "../auth/useAuth";
import { useEffect } from "react";

export default function Callback() {
  const { handleCallback } = useAuth();

  useEffect(() => {
    // 🔑 verifica se já existe sessão salva
    const storedAuth = localStorage.getItem("auth");
    if (storedAuth) {
      console.log("Sessão já encontrada, ignorando callback");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      handleCallback(code).then(() => {
        const lastPath = localStorage.getItem("lastPath") || "/";
        console.log("Passei no callback: " + lastPath);
        localStorage.removeItem("lastPath");

        // limpa o "code" da URL para evitar repetir no reload
        window.history.replaceState({}, document.title, window.location.pathname);

        window.location.replace(lastPath);
      });
    } else {
      console.error("Callback sem código OAuth2!");
      window.location.replace("/");
    }
  }, [handleCallback]);

  return null;
}
