import React, { useEffect, useState } from "react";
import generatePKCE from "../utils/pkce";

interface AppInitializerProps {
  children: React.ReactNode;
}

const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeLocalStorage = async () => {
      // marca primeira vez
      if (!localStorage.getItem("firstLogin")) {
        localStorage.setItem("firstLogin", "true");
      }

      // salva lastPath
      if (!localStorage.getItem("lastPath")) {
        localStorage.setItem("lastPath", window.location.pathname);
      }

      // gera PKCE se necessário
      if (!localStorage.getItem("codeVerifier")) {
        await generatePKCE();
      }

      setIsLoading(false);
    };

    initializeLocalStorage();
  }, []);

  useEffect(() => {
    // timer que roda a cada 30s para verificar expiração
    const interval = setInterval(() => {
      console.log('Verificando sessão');
      const raw = localStorage.getItem("auth");
      if (!raw) return;

      try {
        const parsed = JSON.parse(raw) as {
          expiresIn: number;
          createdAt: number;
        };

        const expired =
          Date.now() - parsed.createdAt > parsed.expiresIn * 1000;

        if (expired) {
          // marca sessão como expirada para o guard redirecionar
          localStorage.setItem("sessionExpired", "true");

          // opcional: remover o auth ou notificar usuário
          // localStorage.removeItem("auth");
        }
      } catch (e) {
        console.error("Erro ao verificar expiração:", e);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return <>{children}</>;
};

export default AppInitializer;
