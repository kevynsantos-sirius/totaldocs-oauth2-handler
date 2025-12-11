import React, { useEffect, useState } from "react";
import generatePKCE from "../utils/pkce";
import { getTokenExpiration } from "../utils/jwtUtils";

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
      if (!localStorage.getItem("firstLogin")) localStorage.setItem("firstLogin", "true");
      if (!localStorage.getItem("lastPath")) localStorage.setItem("lastPath", window.location.pathname);
      if (!localStorage.getItem("codeVerifier")) await generatePKCE();
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
        const parsed = JSON.parse(raw) as { expiresIn: number; createdAt: number; accessToken: string };
        const now = Date.now();
        const exp = getTokenExpiration(parsed.accessToken);
        console.log("Agora: "+now);
        const expMs = parsed.expiresIn * 1000;
        const epochSec = Math.floor(expMs / 1000);
        const expCalc = parsed.createdAt + epochSec;
        console.log("Expiração token: " + exp);
        console.log("Expiração calculada: "+ expCalc);
        const elapsed = now - parsed.createdAt;
        console.log("Tempo desde a data de criação (calc): "+elapsed);
        console.log("Tempo restante (calc): "+ (epochSec - elapsed));
        console.log("Tempo restante (token - now): "+ (now - epochSec));

        

        // se faltam menos de 2min → tenta renovar
        if (epochSec - elapsed < 120000) attemptSilentLogin();
      } catch (e) {
        console.error("Erro ao verificar expiração:", e);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // fluxo OAuth2 silencioso via iframe
  const attemptSilentLogin = async () => {
    try {
      if (!localStorage.getItem("codeVerifier")) await generatePKCE();
      const codeChallenge = encodeURIComponent(localStorage.getItem("codeChallenge") || "");

      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = `${AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
        REDIRECT_URI
      )}&scope=user&code_challenge=${codeChallenge}&code_challenge_method=S256`;

      document.body.appendChild(iframe);

      const pollIframe = setInterval(async () => {
        try {
          const iframeWindow = iframe.contentWindow;
          if (!iframeWindow) throw new Error("Não foi possível acessar iframe");

          const currentUrl = iframeWindow.location.href;

          // se redirecionou para /callback → extrai code e renova token
          if (currentUrl.includes("/callback")) {
            clearInterval(pollIframe);
            const params = new URL(currentUrl).searchParams;
            const code = params.get("code");
            if (code) await exchangeCodeForToken(code);
            document.body.removeChild(iframe);
          } 
          // se redirecionou para outra página (ex: login), sessão expirada
          else if (!currentUrl.startsWith(AUTH_URL)) {
            clearInterval(pollIframe);
            document.body.removeChild(iframe);
            localStorage.setItem("sessionExpired", "true");
            setSessionExpired(true);
          }
        } catch {
          // cross-origin ainda não permitido → ignora e continua polling
        }
      }, 500);
    } catch (err) {
      console.error("Erro no fluxo silencioso:", err);
      localStorage.setItem("sessionExpired", "true");
      setSessionExpired(true);
    }
  };

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

      const newAuth = { accessToken: data.access_token, expiresIn: data.expires_in, createdAt: Date.now() };
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
    localStorage.setItem("sessionExpired", "true");
    navigate("/");
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
