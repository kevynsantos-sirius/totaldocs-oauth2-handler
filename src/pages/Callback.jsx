import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import useAuth from "../auth/useAuth";

export default function Callback() {
  const [params] = useSearchParams();
  const { handleCallback } = useAuth();

  useEffect(() => {
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      console.error("Erro no login:", error);
      return;
    }

    if (code) {
      handleCallback(code); // atualiza auth, sem redirecionar
    }
  }, [params, handleCallback]);

  return null; // nada é renderizado
}
