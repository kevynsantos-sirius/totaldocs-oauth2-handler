import useAuth from "../auth/useAuth";
import { useEffect } from "react";

export default function Callback() {
  const { handleCallback } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      handleCallback(code).then(() => {
        const lastPath = localStorage.getItem("lastPath") || "/";
        console.log("passei no callback:"+lastPath);
        localStorage.removeItem("lastPath");
        window.location.replace(lastPath); // redireciona para a rota salva
      });
    } else {
      console.error("Callback sem código OAuth2!");
      window.location.replace("/"); // fallback
    }
  }, [handleCallback]);

  return null;
}
