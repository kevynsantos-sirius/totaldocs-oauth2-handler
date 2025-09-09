import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import useAuth from "../auth/useAuth";

export default function Callback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback } = useAuth();

  useEffect(() => {
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      console.error("Erro no login:", error);
      return;
    }

    if (code) {
      handleCallback(code).then(() => navigate("/dashboard"));
    }
  }, [params, handleCallback, navigate]);

  return <p>Processando login...</p>;
}
