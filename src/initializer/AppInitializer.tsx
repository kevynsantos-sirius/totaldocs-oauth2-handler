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

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return <>{children}</>;
};

export default AppInitializer;
