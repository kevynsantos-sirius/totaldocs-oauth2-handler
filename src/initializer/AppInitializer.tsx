import React, { useEffect, useState } from "react";
import generatePKCE from "../utils/pkce";

const AUTH_URL = import.meta.env.VITE_OAUTH2_AUTH_URL as string;
const TOKEN_URL = import.meta.env.VITE_OAUTH2_TOKEN_URL as string;
const CLIENT_ID = import.meta.env.VITE_OAUTH2_CLIENT_ID as string;
const REDIRECT_URI = import.meta.env.VITE_OAUTH2_REDIRECT_URI as string;

interface AppInitializerProps {
  children: React.ReactNode;
  navigate: (to: string, options?: { replace?: boolean; state?: any }) => void;
}

const AppInitializer: React.FC<AppInitializerProps> = ({ children, navigate }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // inicializa storage
  useEffect(() => {
    const init = async () => {
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
    init();
  }, []);

  // checa expiração a cada 30s
  useEffect(() => {
    const interval = setInterval(() => {
      const raw = localStorage.getItem("auth");
      if (!raw) return;

      try {
        const parsed = JSON.parse(raw) as {
          expiresIn: number;
          createdAt: number;
        };

        const now = Date.now();
        const expMs = parsed.expiresIn * 1000;
        const elapsed = now - parsed.createdAt;

        // se faltam menos de 2min → tenta renovar
        if (expMs - elapsed < 120000) {
          attemptSilentLogin();
        }
      } catch (e) {
        console.error("Erro ao verificar expiração:", e);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // tenta fluxo OAuth2 silencioso
  const attemptSilentLogin = async () => {
    try {
      // prepara PKCE
      if (!localStorage.getItem("codeVerifier")) {
        await generatePKCE();
      }
      const codeChallenge = encodeURIComponent(localStorage.getItem("codeChallenge") || "");

      // abre popup invisível para pegar code
      const popup = window.open(
        `${AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
          REDIRECT_URI
        )}&scope=user&prompt=none&code_challenge=${codeChallenge}&code_challenge_method=S256`,
        "oauth2silent",
        "width=600,height=600,opacity=0"
      );

      if (!popup) throw new Error("Não foi possível abrir janela para OAuth2");

      // aguarda mensagem do popup
      const listener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data.type === "oauth2_code") {
          window.removeEventListener("message", listener);
          popup.close();
          exchangeCodeForToken(event.data.code);
        } else if (event.data.type === "oauth2_login_required") {
          window.removeEventListener("message", listener);
          popup.close();
          // mostra modal
          localStorage.setItem("sessionExpired", "true");
          setSessionExpired(true);
        }
      };
      window.addEventListener("message", listener);
    } catch (err) {
      console.error("Erro no fluxo silencioso:", err);
      // se der erro, mostra modal
      localStorage.setItem("sessionExpired", "true");
      setSessionExpired(true);
    }
  };

  // troca code por token
  const exchangeCodeForToken = async (code: string) => {
    try {
      const codeVerifier = localStorage.getItem("codeVerifier") ?? "";
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier: codeVerifier,
      });

      const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!response.ok) throw new Error("Falha ao trocar código por token");
      const data = await response.json();

      const newAuth = {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
        createdAt: Date.now(),
      };

      localStorage.setItem("auth", JSON.stringify(newAuth));
      localStorage.removeItem("sessionExpired");
      setSessionExpired(false);
    } catch (err) {
      console.error("Erro ao trocar código por token:", err);
      localStorage.setItem("sessionExpired", "true");
      setSessionExpired(true);
    }
  };

  const handleModalOk = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/"); // volta para login
    setSessionExpired(false);
  };

  if (isLoading) return <div>Carregando...</div>;

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
