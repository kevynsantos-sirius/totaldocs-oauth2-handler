import { useEffect } from "react";
import useAuth from "../auth/useAuth";

export default function Callback() {
  const { handleCallback } = useAuth();

  useEffect(() => {
    // Extrai o código da query string manualmente
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      handleCallback(code); // usa window.location.replace() dentro do handleCallback
    } else {
      console.error("Callback sem código OAuth2!");
      window.location.replace("/"); // fallback
    }
  }, [handleCallback]);

  return null;
}
