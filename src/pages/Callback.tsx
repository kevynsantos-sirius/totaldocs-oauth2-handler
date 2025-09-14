import useAuth from "../auth/useAuth";
import { useEffect } from "react";

export default function Callback() {
  const { handleCallback } = useAuth();

 useEffect(() => {
  // aqui ele roda apenas uma vez quando o Callback monta
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
      localStorage.removeItem("lastPath");
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.replace(lastPath);
    });
  } else {
    console.error("Callback sem código OAuth2!");
    window.location.replace("/");
  }
}, []); // 👈 array vazio garante que roda só uma vez


  return null;
}
