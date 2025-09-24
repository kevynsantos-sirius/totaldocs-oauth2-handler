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
  const [iframeShown, setIframeShown] = useState<boolean>(
    () => !!localStorage.getItem("iframeShown")
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  // troca código por token
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

      // limpar iframe e flags antes de navegar
      localStorage.removeItem("iframeShown");
      setIframeShown(false);

      // remover ?code=... da URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // marcar como autenticado —> React desmonta o iframe e renderiza o app
      setStatus("authenticated");

      // redirecionar se estiver em /callback
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

  // verificação inicial
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
              try {
                await generatePKCE();
              } catch (e) {
                console.error("Erro ao gerar PKCE antes de fetchToken:", e);
                setErrorMessage("Erro interno ao preparar autenticação");
                setStatus("error");
                return;
              }
            }
            fetchToken(code);
          }
          return;
        }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // prepara PKCE quando status = needs_login
  useEffect(() => {
    if (status !== "needs_login") return;

    const prepare = async () => {
      try {
        if (!localStorage.getItem("firstLogin"))
          localStorage.setItem("firstLogin", "true");
        localStorage.setItem("lastPath", window.location.pathname);
        if (!localStorage.getItem("codeVerifier")) {
          await generatePKCE();
        }
      } catch (e) {
        console.error("Erro preparing PKCE:", e);
        setErrorMessage("Erro interno ao iniciar autenticação");
        setStatus("error");
      }
    };
    prepare();
  }, [status]);

  // manter iframeShown em sync com localStorage
  useEffect(() => {
    if (status === "needs_login" && !iframeShown) {
      localStorage.setItem("iframeShown", "true");
      setIframeShown(true);
    }
  }, [status, iframeShown]);

  // ---------- RENDERING ----------
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
              localStorage.removeItem("auth");
              localStorage.removeItem("iframeShown");
              localStorage.removeItem("codeVerifier");
              localStorage.removeItem("codeChallenge");
              sessionStorage.removeItem("oauth2_processed_code");
              window.location.reload();
            }}
            style={{ marginRight: 8 }}
          >
            Limpar dados e recarregar
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("iframeShown");
              setIframeShown(false);
              setErrorMessage("");
              setStatus("needs_login");
            }}
          >
            Tentar novamente
          </button>
        </div>
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

  // só renderiza o iframe se status=needs_login e iframeShown=true
  if (status === "needs_login" && iframeShown) {
    const codeChallenge = encodeURIComponent(
      localStorage.getItem("codeChallenge") || ""
    );
    return (
      <iframe
        key="oauth-iframe"
        src={`${AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
          REDIRECT_URI
        )}&scope=user&code_challenge=${codeChallenge}&code_challenge_method=S256`}
        title="OAuth2 Login"
        style={{ width: "100vw", height: "100vh", border: "none" }}
      />
    );
  }

  if (status === "authenticated") {
    return <ComponentToRender key="main-app" />;
  }

  // fallback
  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <p>Verificando sessão...</p>
    </div>
  );
};

export default OAuth2SessionGuard;
