import { useEffect, useState } from "react";
import apiClient from "../api/apiClient.js";
import generatePKCE from "../utils/pkce.js";
import { AUTH_URL, TOKEN_URL, CLIENT_ID, REDIRECT_URI } from "../config/envHelper.js";

interface Auth {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  createdAt: number;
}

interface OAuth2SessionGuardProps<P = any> {
  ComponentToRender: React.ComponentType<P>;
  navigate: (to: string, options?: { replace?: boolean; state?: any }) => void;
}

type LoadingScreenProps = {
  message: string;
};

const LoadingScreen = ({ message }: LoadingScreenProps) => {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Arial",
        background: "#f9fafb"
      }}
    >
      <div className="spinner"></div>

      <p style={{ marginTop: 20, fontSize: 18, color: "#444" }}>
        {message}
      </p>

      <style>
        {`
        .spinner {
          width: 48px;
          height: 48px;
          border: 5px solid #e5e7eb;
          border-top: 5px solid #2563eb;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        `}
      </style>
    </div>
  );
};

type Status =
  | "idle"
  | "checking"
  | "needs_login"
  | "logout"
  | "authenticating"
  | "authenticated"
  | "error";

const OAuth2SessionGuard = ({
  ComponentToRender,
  navigate,
}: OAuth2SessionGuardProps) => {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

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

      const { data } = await apiClient.post(TOKEN_URL, body);

      const newAuth: Auth = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        createdAt: Date.now(),
      };

      localStorage.setItem("auth", JSON.stringify(newAuth));
      localStorage.removeItem("sessionExpired");
      sessionStorage.setItem("oauth2_processed_code", code);

      window.history.replaceState({}, document.title, window.location.pathname);
      setStatus("authenticated");

      if (window.location.pathname.includes("/callback")) {
        const lastPath = localStorage.getItem("lastPath") || "/home";
        navigate(lastPath, { replace: true });
      }
    } catch (err) {
      console.error("Erro ao trocar o código:", err);
      setErrorMessage("Falha na autenticação");
      setStatus("error");
    } finally {
      sessionStorage.removeItem("oauth2_processing");
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setStatus("checking");

        const raw = localStorage.getItem("auth");
        const sessionExpired = !!localStorage.getItem("sessionExpired");

        if (raw && !sessionExpired) {
          const parsed: Auth = JSON.parse(raw);
          const expired =
            Date.now() - parsed.createdAt > parsed.expiresIn * 1000;

          if (!expired) {
            if (mounted) setStatus("authenticated");
            return;
          }

          localStorage.removeItem("auth");
        }

        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        const manualLogout = localStorage.getItem("manualLogout") === "true";

        if (code && manualLogout) {
          window.history.replaceState({}, document.title, window.location.pathname);
          if (mounted) setStatus("logout");
          return;
        }

        if (code) {
          const processed = sessionStorage.getItem("oauth2_processed_code");
          if (processed !== code) {
            if (!localStorage.getItem("codeVerifier")) {
              await generatePKCE();
            }
            fetchToken(code);
            return;
          }
        }

        if (mounted) setStatus("needs_login");
      } catch (e) {
        console.error("Erro no init:", e);
        setErrorMessage("Erro inesperado");
        if (mounted) setStatus("error");
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleLogout = () => {
      localStorage.clear();
      sessionStorage.clear();

      localStorage.setItem("manualLogout", "true");
      localStorage.setItem("sessionExpired", "true");

      setStatus("logout");
    };

    window.addEventListener("oauth2:logout", handleLogout);
    return () => window.removeEventListener("oauth2:logout", handleLogout);
  }, []);

  useEffect(() => {
    if (status !== "needs_login") return;

    const redirectToLogin = async () => {
      try {
        localStorage.setItem("lastPath", window.location.pathname);

        if (!localStorage.getItem("codeVerifier")) {
          await generatePKCE();
        }

        const codeChallenge = encodeURIComponent(
          localStorage.getItem("codeChallenge") || ""
        );

        window.location.href =
          `${AUTH_URL}?response_type=code` +
          `&client_id=${CLIENT_ID}` +
          `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
          `&scope=user` +
          `&prompt=login` +
          `&code_challenge=${codeChallenge}` +
          `&code_challenge_method=S256`;
      } catch (e) {
        console.error("Erro no redirect:", e);
        setErrorMessage("Erro ao iniciar autenticação");
        setStatus("error");
      }
    };

    redirectToLogin();
  }, [status]);

  if (status === "logout") {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <h2>Você saiu da conta</h2>
        <button
          onClick={() => {
            localStorage.removeItem("manualLogout");
            setStatus("needs_login");
          }}
        >
          Entrar novamente
        </button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <h2 style={{ color: "crimson" }}>Erro de autenticação</h2>
        <p>{errorMessage}</p>
        <button
          onClick={() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
          }}
        >
          Limpar dados e recarregar
        </button>
      </div>
    );
  }

  if (status === "authenticating") {
    return <LoadingScreen message="Processando autenticação..." />;
  }

  if (status === "authenticated") {
    return <ComponentToRender />;
  }

  return <LoadingScreen message="Verificando sessão..." />;
};

export default OAuth2SessionGuard;