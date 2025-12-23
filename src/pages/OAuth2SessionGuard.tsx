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
  | "logged_out"
  | "error";

const OAuth2SessionGuard: React.FC<OAuth2SessionGuardProps> = ({
  ComponentToRender,
  navigate,
}) => {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // =========================
  // 🔁 TROCA CODE POR TOKEN
  // =========================
  const fetchToken = async (code: string) => {
    if (sessionStorage.getItem("oauth2_processing")) return;
    sessionStorage.setItem("oauth2_processing", "true");

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

      const auth: Auth = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        createdAt: Date.now(),
      };

      localStorage.setItem("auth", JSON.stringify(auth));

      window.history.replaceState({}, document.title, window.location.pathname);
      setStatus("authenticated");

      if (window.location.pathname.includes("/callback")) {
        const lastPath = localStorage.getItem("lastPath") || "/home";
        navigate(lastPath, { replace: true });
      }
    } catch (err: any) {
      console.error("Erro ao autenticar:", err);
      setErrorMessage("Erro ao autenticar");
      setStatus("error");
    } finally {
      sessionStorage.removeItem("oauth2_processing");
    }
  };

  // =========================
  // 🚀 INIT
  // =========================
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setStatus("checking");

        const raw = localStorage.getItem("auth");
        if (raw) {
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

        if (code) {
          if (!localStorage.getItem("codeVerifier")) {
            await generatePKCE();
          }
          fetchToken(code);
          return;
        }

        if (mounted) setStatus("needs_login");
      } catch (e) {
        console.error("Erro no init:", e);
        setStatus("error");
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, []);

  // =========================
  // 🔓 LOGOUT GLOBAL (EVENTO)
  // =========================
  useEffect(() => {
    const handleLogout = () => {
      localStorage.clear();
      sessionStorage.clear();

      setStatus("logged_out");
      navigate("/", { replace: true });
    };

    window.addEventListener("oauth2:logout", handleLogout);
    return () =>
      window.removeEventListener("oauth2:logout", handleLogout);
  }, [navigate]);

  // =========================
  // 🔐 REDIRECT LOGIN
  // =========================
  useEffect(() => {
    if (status !== "needs_login") return;

    const redirectToLogin = async () => {
      try {
        localStorage.setItem("lastPath", window.location.pathname);

        if (!localStorage.getItem("codeVerifier")) {
          await generatePKCE();
        }

        const codeChallenge =
          localStorage.getItem("codeChallenge") ?? "";

        window.location.href = `${AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
          REDIRECT_URI
        )}&scope=user&code_challenge=${encodeURIComponent(
          codeChallenge
        )}&code_challenge_method=S256`;
      } catch {
        setStatus("error");
      }
    };

    redirectToLogin();
  }, [status]);

  // =========================
  // 🎨 RENDER
  // =========================
  if (status === "logged_out") {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <h2>Você saiu da aplicação</h2>
        <button onClick={() => setStatus("needs_login")}>
          Entrar novamente
        </button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <h2 style={{ color: "crimson" }}>Erro inesperado</h2>
        <button
          onClick={() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
          }}
        >
          Limpar e recarregar
        </button>
      </div>
    );
  }

  if (status === "authenticating") {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <p>Processando autenticação...</p>
      </div>
    );
  }

  if (status === "authenticated") {
    return <ComponentToRender />;
  }

  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <p>Verificando sessão...</p>
    </div>
  );
};

export default OAuth2SessionGuard;
