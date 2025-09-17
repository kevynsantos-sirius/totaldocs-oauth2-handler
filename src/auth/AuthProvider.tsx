import { useState, useEffect, useCallback, useRef, ReactNode } from "react";
import AuthContext from "./AuthContext";
import apiClient from "../api/apiClient";
import { generatePKCE } from "../utils/pkce";
import { getTokenExpiration } from "../utils/jwtUtils"; // Importando a função para pegar a expiração do token

// Função para criar o iframe se ele ainda não existir
function buildIframe() {
  const src = localStorage.getItem("urlIframe") || "";
  let iframe = document.getElementById("iframe-oauth2") as HTMLIFrameElement;

  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "iframe-oauth2";
    iframe.src = src;
    iframe.title = "OAuth Login";
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.left = "0";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.zIndex = "9999";
    iframe.style.background = "white";
    document.body.appendChild(iframe);
  } else {
    showIframe();
  }
}

// Função para esconder o iframe
function hideIframe() {
  const iframe = document.getElementById("iframe-oauth2") as HTMLIFrameElement;
  if (iframe) {
    iframe.style.display = "none";
  }
}

function removeIframe() {
  document.getElementById("iframe-oauth2")?.remove();
}

// Função para mostrar o iframe e atualizar o src
function showIframe() {
  const src = localStorage.getItem("urlIframe") || "";
  const iframe = document.getElementById("iframe-oauth2") as HTMLIFrameElement;
  if (iframe) {
    iframe.style.display = "block";
    iframe.src = src;
  }
}

const AUTH_URL = import.meta.env.VITE_OAUTH2_AUTH_URL as string;
const TOKEN_URL = import.meta.env.VITE_OAUTH2_TOKEN_URL as string;
const CLIENT_ID = import.meta.env.VITE_OAUTH2_CLIENT_ID as string;
const REDIRECT_URI = import.meta.env.VITE_OAUTH2_REDIRECT_URI as string;
const REFRESH_TIME = Number(import.meta.env.VITE_OAUTH2_REFRESH_TIME);

interface AuthProviderProps {
  children: ReactNode;
}

interface AuthData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  createdAt: number;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [auth, setAuth] = useState<AuthData | null>(() => {
    const stored = localStorage.getItem("auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.createdAt = parsed.createdAt ? Number(parsed.createdAt) : Date.now();
      return parsed;
    }
    return null;
  });
  const [manualLogout, setManualLogout] = useState(false);
  const [loginCompleted, setLoginCompleted] = useState(false);
  const [isLoginInProgress, setIsLoginInProgress] = useState<boolean>(false); // Controle do login em progresso

  const authRef = useRef(auth);
  useEffect(() => { authRef.current = auth; }, [auth]);

  useEffect(() => {
    if (auth) localStorage.setItem("auth", JSON.stringify(auth));
    else localStorage.removeItem("auth");
  }, [auth]);

  // Callback do OAuth
  const handleCallback = useCallback(async (code: string) => {
    const codeVerifier = localStorage.getItem("pkce_verifier") || "";
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: codeVerifier,
    });

    try {
      const response = await apiClient.post(TOKEN_URL, body);
      setAuth({
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
        createdAt: Date.now(),
      });
      hideIframe();
      setManualLogout(false);
      setLoginCompleted(true);

      const lastPath = localStorage.getItem("lastPath") || "/";
      localStorage.removeItem("lastPath");
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.replace(lastPath);
    } catch (err: any) {
      console.error("Falha no login:", err.response?.data || err.message);
      buildIframe();
    }
  }, []);

  // Login
  const login = useCallback(async () => {
    // Se o login já estiver em progresso, não faz nada
    if (isLoginInProgress) return;
    
    setIsLoginInProgress(true); // Marca o login como em progresso
    const { codeVerifier, codeChallenge } = await generatePKCE();
    localStorage.setItem("pkce_verifier", codeVerifier);

    const url = `${AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&scope=user&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    localStorage.setItem("urlIframe", url);
    buildIframe();

    const messageListener = (event: MessageEvent) => {
      if (event.origin !== window.origin) return;
      const { code } = event.data as { code?: string };
      if (code) handleCallback(code);
    };

    window.addEventListener("message", messageListener, { once: true });
  }, [handleCallback, isLoginInProgress]);

  const logout = useCallback(() => {
    localStorage.removeItem("auth");
    localStorage.removeItem("pkce_verifier");
    setAuth(null);
    hideIframe();
    setManualLogout(true);
  }, []);

  // Intervalo para monitorar token
  useEffect(() => {
    const interval = setInterval(() => {
      const accessToken = localStorage.getItem("auth");
      if (!accessToken) {
        setAuth(null);
        localStorage.removeItem("pkce_verifier");
        removeIframe();
        window.location.replace("/");  // Redireciona para a rota "/"
        return;
      }

      const tokenExpiration = getTokenExpiration(accessToken); // Obtém o valor do exp

      if (tokenExpiration && Date.now() >= tokenExpiration * 1000) {
        // Caso o token tenha expirado, limpa o localStorage e redireciona para "/"
        localStorage.removeItem("auth");
        localStorage.removeItem("pkce_verifier");
        setAuth(null);
        removeIframe();
        window.location.replace("/");  // Redireciona para a rota "/"
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [login]);

  useEffect(() => {
    const storedAuth = localStorage.getItem("auth");
    if (!auth && !manualLogout && !storedAuth && !loginCompleted) {
      login();
    }
  }, [auth, manualLogout, loginCompleted, login]);

  const checkLogin = useCallback(async (redirectBack: boolean = false) => {
    if (redirectBack) localStorage.setItem("lastPath", window.location.pathname);
    await login();
  }, [login]);

  return (
    <AuthContext.Provider value={{ auth, login, logout, handleCallback, checkLogin }}>
      {children}
    </AuthContext.Provider>
  );
}
