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
  | "logout"
  | "authenticating"
  | "authenticated"
  | "error";

const OAuth2SessionGuard: React.FC<OAuth2SessionGuardProps> = ({
  ComponentToRender,
  navigate,
}) => {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // ================= TOKEN EXCHANGE =================
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

  // ================= INIT =================
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

        // 🔥 BLOQUEIA AUTO LOGIN APÓS LOGOUT
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

  // ================= LOGOUT EVENT =================
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

  // ================= REDIRECT LOGIN (SÓ needs_login) =================
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
          `&prompt=login` + // 🔥 AQUI
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

  // ================= RENDER =================
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
    return <div style={{ padding: 24 }}>Processando autenticação…</div>;
  }

  if (status === "authenticated") {
    return <ComponentToRender />;
  }

  return <div style={{ padding: 24 }}>Verificando sessão…</div>;
};

export default OAuth2SessionGuard;
