import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from '../auth/useAuth.js';

export default function Callback() {
  const { handleCallback } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Extrai o código da query string
    const params = new URLSearchParams(location.search);
    const code = params.get("code");

    if (code) {
      handleCallback(code).then(() => {
        // Redireciona para a rota principal após login
        navigate("/", { replace: true });
      });
    } else {
      console.error("❌ Callback sem código OAuth2!");
      navigate("/", { replace: true });
    }
  }, [location.search, handleCallback, navigate]);

  return <></>;
}
