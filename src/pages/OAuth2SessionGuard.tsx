import { useEffect, useState } from "react";
import apiClient from "../api/apiClient";
import generatePKCE from "../utils/pkce";

const AUTH_URL = import.meta.env.VITE_OAUTH2_AUTH_URL as string;
const TOKEN_URL = import.meta.env.VITE_OAUTH2_TOKEN_URL as string;
const CLIENT_ID = import.meta.env.VITE_OAUTH2_CLIENT_ID as string;
const REDIRECT_URI = import.meta.env.VITE_OAUTH2_REDIRECT_URI as string;

interface Auth {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  createdAt: number;
}

interface OAuth2SessionGuardProps {
  ComponentToRender: React.FC<any>;
  navigate: (to: string, options?: { replace?: boolean; state?: any }) => void;
}

type Status =
  | "idle"
  | "checking"
  | "needs_login"
  | "authenticating"
  | "authenticated"
  | "error";

const OAuth2SessionGuard: React.FC<OAuth2SessionGuardProps> = ({
  ComponentToRender,
  navigate,
}) => {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Troca código por token
  const fetchToken = async (code: string) => {
    if (sessionStorage.getItem("oauth2_processing")) return;
    sessionStorage.setItem("oauth2_processing", code);

    try {
      setStatus("authenticating");

      const codeVerifier = localStorage.getItem("codeVerifier") ?? "";
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier: codeVerifier,
      });

      const response = await apiClient.post(TOKEN_URL, body);
      const data = response.data;

      const newAuth: Auth = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        createdAt: Date.now(),
      };

      localStorage.setItem("auth", JSON.stringify(newAuth));
      sessionStorage.setItem("oauth2_processed_code", code);

      // Remove ?code=... da URL
      window.history.replaceState({}, document.title, window.location.pathname);

      setStatus("authenticated");

      // Redireciona se estiver na rota de callback
      if (window.location.pathname.includes("/callback")) {
        const lastPath = localStorage.getItem("lastPath") || "/home";
        navigate(lastPath, { replace: true });
      }
    } catch (err: any) {
      console.error("Erro ao trocar o código por token:", err);
      setErrorMessage(err?.message ?? "Erro na autenticação");
      setStatus("error");
    } finally {
      sessionStorage.removeItem("oauth2_processing");
    }
  };

  // Inicialização
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setStatus("checking");

        const raw = localStorage.getItem("auth");
        if (raw) {
          try {
            const parsed: Auth = JSON.parse(raw);
            const expired =
              Date.now() - parsed.createdAt > parsed.expiresIn * 1000;
            const sessionExpired = !!localStorage.getItem("sessionExpired");
            if (!expired && !sessionExpired) {
              if (mounted) setStatus("authenticated");
              return;
            } else {
              localStorage.removeItem("auth");
            }
          } catch {
            localStorage.removeItem("auth");
          }
        }

        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        if (code) {
          const processed = sessionStorage.getItem("oauth2_processed_code");
          if (processed === code) {
            window.history.replaceState({}, document.title, window.location.pathname);
            if (mounted) setStatus("needs_login");
            return;
          }
          if (mounted) {
            if (!localStorage.getItem("codeVerifier")) {
              await generatePKCE();
            }
            fetchToken(code);
          }
          return;
        }

        // Se não há código nem sessão, precisa logar
        if (mounted) setStatus("needs_login");
      } catch (e: any) {
        console.error("Erro no init do OAuth2SessionGuard:", e);
        setErrorMessage(e?.message ?? "Erro inesperado");
        if (mounted) setStatus("error");
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, []);

  // Redireciona para o login se status = needs_login
  useEffect(() => {
    if (status !== "needs_login") return;

    const redirectToLogin = async () => {
      try {
        if (!localStorage.getItem("firstLogin"))
          localStorage.setItem("firstLogin", "true");

        localStorage.setItem("lastPath", window.location.pathname);

        if (!localStorage.getItem("codeVerifier")) {
          await generatePKCE();
        }

        const codeChallenge = encodeURIComponent(
          localStorage.getItem("codeChallenge") || ""
        );
        window.location.href = `${AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
          REDIRECT_URI
        )}&scope=user&code_challenge=${codeChallenge}&code_challenge_method=S256`;
      } catch (e) {
        console.error("Erro ao preparar redirecionamento OAuth2:", e);
        setErrorMessage("Erro interno ao iniciar autenticação");
        setStatus("error");
      }
    };

    redirectToLogin();
  }, [status]);

  // ---------- RENDER ----------
  if (status === "error") {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <h2 style={{ color: "crimson" }}>Ocorreu um erro inesperado</h2>
        <p>
          {errorMessage ||
            "Tente recarregar a página ou limpar os dados de autenticação."}
        </p>
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            style={{ marginRight: 8 }}
          >
            Limpar dados e recarregar
          </button>
        </div>
      </div>
    );
  }

  if (status === "authenticating") {
      return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div style={{ marginBottom: 16 }}>
          <div 
            style={{
              width: 40,
              height: 40,
              border: "4px solid #ccc",
              borderTop: "4px solid #1976d2",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto",
            }}
          />
        </div>
        <p style={{ fontSize: 16, fontWeight: "bold" }}>Processando autenticação...</p>
        <p style={{ fontSize: 14, color: "#555" }}>Isso pode levar alguns segundos</p>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  if (status === "authenticated") {
    return <ComponentToRender key="main-app" />;
  }

  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <p>Verificando sessão...</p>
    </div>
  );
};

export default OAuth2SessionGuard;
