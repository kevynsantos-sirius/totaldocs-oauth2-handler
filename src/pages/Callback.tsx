// src/pages/Callback.tsx
import useAuth from "../auth/useAuth";
import { useEffect } from "react";

export default function Callback() {
  const { handleCallback } = useAuth();

  useEffect(() => {
    const storedAuth = localStorage.getItem("auth");
    if (storedAuth) return; // já logado, ignora callback

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      handleCallback(code).then(() => {
        localStorage.removeItem("lastPath");
        window.history.replaceState({}, document.title, window.location.pathname);
      });
    } else {
      console.error("Callback sem código OAuth2!");
      window.location.replace("/");
    }
  }, [handleCallback]);

  return null;
}
