import React, { useEffect, useState } from "react";
import generatePKCE from "../utils/pkce";

interface AppInitializerProps {
  children: React.ReactNode;
  navigate: (to: string, options?: { replace?: boolean; state?: any }) => void; // obrigatório, igual no guard
}

const AppInitializer: React.FC<AppInitializerProps> = ({ children, navigate }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const initializeLocalStorage = async () => {
      if (!localStorage.getItem("firstLogin")) {
        localStorage.setItem("firstLogin", "true");
      }

      if (!localStorage.getItem("lastPath")) {
        localStorage.setItem("lastPath", window.location.pathname);
      }

      if (!localStorage.getItem("codeVerifier")) {
        await generatePKCE();
      }

      setIsLoading(false);
    };

    initializeLocalStorage();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      console.log("Verificando sessão");
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
          localStorage.setItem("sessionExpired", "true");
          setSessionExpired(true);
        }
      } catch (e) {
        console.error("Erro ao verificar expiração:", e);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleModalOk = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/"); // usa o navigate passado por props
    setSessionExpired(false);
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <>
      {children}

      {sessionExpired && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "24px",
              borderRadius: "8px",
              maxWidth: "400px",
              textAlign: "center",
            }}
          >
            <h2>Sessão expirada</h2>
            <p>Por favor, faça login novamente.</p>
            <button
              onClick={handleModalOk}
              style={{
                marginTop: "16px",
                padding: "8px 16px",
                background: "#007bff",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Ok
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AppInitializer;
