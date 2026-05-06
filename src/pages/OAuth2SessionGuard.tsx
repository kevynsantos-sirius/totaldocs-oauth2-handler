import { useEffect, useState } from "react";
import apiClient from "../api/apiClient.js";
import generatePKCE from "../utils/pkce.js";

interface Auth {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  createdAt: number;
}

interface OAuth2Config {
  AUTH_URL: string;
  TOKEN_URL: string;
  CLIENT_ID: string;
  REDIRECT_URI: string;
  BASENAME?: string; // ✅ ADICIONADO
}

interface OAuth2SessionGuardProps<P = any> {
  ComponentToRender: React.ComponentType<P>;
  navigate: (to: string, options?: { replace?: boolean; state?: any }) => void;
  config: OAuth2Config;
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
  config,
}: OAuth2SessionGuardProps) => {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const { AUTH_URL, TOKEN_URL, CLIENT_ID, REDIRECT_URI, BASENAME = "" } = config;

  const stripBasename = (path: string) =>
    BASENAME && path.startsWith(BASENAME) ? path.slice(BASENAME.length) : path;

  const fetchToken = async (code: string) => {
    console.log("[OAuth2SessionGuard] fetchToken iniciado com code:", code);

    if (sessionStorage.getItem("oauth2_processing")) {
      console.log("[OAuth2SessionGuard] fetchToken já em processamento, abortando");
      return;
    }

    sessionStorage.setItem("oauth2_processing", code);

    try {
      setStatus("authenticating");
      console.log("[OAuth2SessionGuard] Status setado para authenticating");

      const codeVerifier = localStorage.getItem("codeVerifier") ?? "";
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier: codeVerifier,
      });

      console.log("[OAuth2SessionGuard] Enviando request para TOKEN_URL", TOKEN_URL);
      const { data } = await apiClient.post(TOKEN_URL, body);
      console.log("[OAuth2SessionGuard] Resposta do TOKEN_URL:", data);

      const newAuth: Auth = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        createdAt: Date.now(),
      };

      localStorage.setItem("auth", JSON.stringify(newAuth));
      console.log("[OAuth2SessionGuard] Token salvo no localStorage:", newAuth);
      localStorage.removeItem("sessionExpired");
      sessionStorage.setItem("oauth2_processed_code", code);

      window.history.replaceState({}, document.title, window.location.pathname);
      setStatus("authenticated");
      console.log("[OAuth2SessionGuard] Status setado para authenticated");

      if (window.location.pathname.includes("/callback")) {
        const lastPath = localStorage.getItem("lastPath") || "/home";
        console.log("[OAuth2SessionGuard] Redirecionando para lastPath:", lastPath);
        navigate(lastPath, { replace: true });
      }
    } catch (err) {
      console.error("[OAuth2SessionGuard] Erro ao trocar código:", err);
      setErrorMessage("Falha na autenticação");
      setStatus("error");
    } finally {
      sessionStorage.removeItem("oauth2_processing");
      console.log("[OAuth2SessionGuard] fetchToken finalizado");
    }
  };

  useEffect(() => {
    console.log("[OAuth2SessionGuard] useEffect init executado");

    let mounted = true;

    const init = async () => {
      try {
        setStatus("checking");
        console.log("[OAuth2SessionGuard] Status setado para checking");

        const raw = localStorage.getItem("auth");
        console.log("[OAuth2SessionGuard] auth do localStorage:", raw);

        const sessionExpired = !!localStorage.getItem("sessionExpired");

        if (raw && !sessionExpired) {
          const parsed: Auth = JSON.parse(raw);
          const expired = Date.now() - parsed.createdAt > parsed.expiresIn * 1000;

          console.log("[OAuth2SessionGuard] Token expirado?", expired);

          if (!expired) {
            if (mounted) setStatus("authenticated");
            console.log("[OAuth2SessionGuard] Token válido, status authenticated");
            return;
          }

          localStorage.removeItem("auth");
          console.log("[OAuth2SessionGuard] Token expirado removido");
        }

        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        console.log("[OAuth2SessionGuard] Código recebido na URL:", code);

        const manualLogout = localStorage.getItem("manualLogout") === "true";

        if (code && manualLogout) {
          console.log("[OAuth2SessionGuard] Manual logout detectado");
          window.history.replaceState({}, document.title, window.location.pathname);
          if (mounted) setStatus("logout");
          return;
        }

        if (code) {
          const processed = sessionStorage.getItem("oauth2_processed_code");
          if (processed !== code) {
            console.log("[OAuth2SessionGuard] Código novo, iniciando fetchToken");
            if (!localStorage.getItem("codeVerifier")) {
              await generatePKCE();
              console.log("[OAuth2SessionGuard] PKCE gerado");
            }
            fetchToken(code);
            return;
          }
        }

        if (mounted) setStatus("needs_login");
        console.log("[OAuth2SessionGuard] Nenhum código encontrado, status needs_login");
      } catch (e) {
        console.error("[OAuth2SessionGuard] Erro no init:", e);
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
      console.log("[OAuth2SessionGuard] logout detectado");
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
      console.log("[OAuth2SessionGuard] Redirecionando para login");

      try {
        localStorage.setItem(
          "lastPath",
          stripBasename(window.location.pathname)
        );
        console.log("[OAuth2SessionGuard] lastPath salvo:", window.location.pathname);

        if (!localStorage.getItem("codeVerifier")) {
          await generatePKCE();
          console.log("[OAuth2SessionGuard] PKCE gerado antes do redirect");
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
        console.error("[OAuth2SessionGuard] Erro no redirect:", e);
        setErrorMessage("Erro ao iniciar autenticação");
        setStatus("error");
      }
    };

    redirectToLogin();
  }, [status]);

  if (status === "logout") {
    console.log("[OAuth2SessionGuard] Status logout");
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
    console.log("[OAuth2SessionGuard] Status error:", errorMessage);
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <h2 style={{ color: "crimson" }}>Erro de autenticação</h2>
        <p>{errorMessage}</p>
        <button
          onClick={() => {
            console.log("[OAuth2SessionGuard] Limpar dados e recarregar");
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
    console.log("[OAuth2SessionGuard] Status authenticating");
    return <LoadingScreen message="Processando autenticação..." />;
  }

  if (status === "authenticated") {
    console.log("[OAuth2SessionGuard] Status authenticated, renderizando componente");
    return <ComponentToRender />;
  }

  console.log("[OAuth2SessionGuard] Status default, verificando sessão...");
  return <LoadingScreen message="Verificando sessão..." />;
};

export default OAuth2SessionGuard;