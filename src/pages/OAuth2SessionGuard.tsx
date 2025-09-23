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

type Status = "idle" | "checking" | "needs_login" | "authenticating" | "authenticated" | "error";

const OAuth2SessionGuard: React.FC<OAuth2SessionGuardProps> = ({ ComponentToRender, navigate }) => {
  const [status, setStatus] = useState<Status>("idle");
  const [iframeShown, setIframeShown] = useState<boolean>(() => !!localStorage.getItem("iframeShown"));
  const [errorMessage, setErrorMessage] = useState<string>("");

  // fetchToken declared before useEffect so it's stable
  const fetchToken = async (code: string) => {
    // prevent parallel processing
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

      // Save token and update status
      localStorage.setItem("auth", JSON.stringify(newAuth));
      // mark code as processed so we don't try again
      sessionStorage.setItem("oauth2_processed_code", code);

      // clean up iframe flag and url BEFORE navigating
      localStorage.removeItem("iframeShown");
      setIframeShown(false);
      // remove ?code=... from URL
      window.history.replaceState({}, document.title, window.location.pathname);

      setStatus("authenticated");

      // Only navigate if we are on /callback (avoid remount loops)
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

  // Initial boot: check local token + detect code query param
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setStatus("checking");

        // check existing token
        const raw = localStorage.getItem("auth");
        if (raw) {
          try {
            const parsed: Auth = JSON.parse(raw);
            const expired = Date.now() - parsed.createdAt > parsed.expiresIn * 1000;
            const sessionExpired = !!localStorage.getItem("sessionExpired");
            if (!expired && !sessionExpired) {
              if (mounted) setStatus("authenticated");
              return;
            } else {
              // expired -> remove and fallthrough to login flow
              localStorage.removeItem("auth");
            }
          } catch (e) {
            // corrupted auth blob -> remove and fallthrough
            localStorage.removeItem("auth");
          }
        }

        // If there's a ?code=... param, handle it (but only once)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        if (code) {
          const processed = sessionStorage.getItem("oauth2_processed_code");
          if (processed === code) {
            // already processed (maybe a redirect remount) -> clean URL and go to needs_login
            window.history.replaceState({}, document.title, window.location.pathname);
            if (mounted) setStatus("needs_login");
            return;
          }
          // process token
          if (mounted) {
            // ensure PKCE exists (safe guard)
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

        // no token and no code -> we need to show login iframe
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
  }, []); // run once on mount

  // When we need login, ensure PKCE exists and persist lastPath/firstLogin
  useEffect(() => {
    if (status !== "needs_login") return;

    const prepare = async () => {
      try {
        if (!localStorage.getItem("firstLogin")) localStorage.setItem("firstLogin", "true");
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

  // keep iframeShown state in sync with localStorage, set flag only once
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
        <p>{errorMessage || "Tente recarregar a página ou limpar os dados de autenticação."}</p>
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => {
              // quick clear and reload
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
              // attempt a soft retry: clear iframe flag and go to needs_login
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

  // If not authenticated, show iframe (if not already shown)
  if (status === "needs_login") {
    const codeChallenge = encodeURIComponent(localStorage.getItem("codeChallenge") || "");
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

  // Authenticated: render app
  if (status === "authenticated") {
    return <ComponentToRender key="main-app" />;
  }

  // Fallback minimal (status idle/checking)
  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <p>Verificando sessão...</p>
    </div>
  );
};

export default OAuth2SessionGuard;
