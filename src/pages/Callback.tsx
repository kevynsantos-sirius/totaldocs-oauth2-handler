import useAuth from "../auth/useAuth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Callback() {
  const { handleCallback } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const storedAuth = localStorage.getItem("auth");
    if (storedAuth) {
      console.log("Sessão já encontrada, ignorando callback");
      navigate("/", { replace: true }); // ou lastPath
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      handleCallback(code).then(() => {
        const lastPath = localStorage.getItem("lastPath") || "/";
        console.log("Passei no callback: " + lastPath);
        localStorage.removeItem("lastPath");

        window.history.replaceState({}, document.title, window.location.pathname);
        navigate(lastPath, { replace: true }); // ✅ mantém o SPA funcionando
      });
    } else {
      console.error("Callback sem código OAuth2!");
      navigate("/", { replace: true });
    }
  }, [handleCallback, navigate]);

  return null;
}
