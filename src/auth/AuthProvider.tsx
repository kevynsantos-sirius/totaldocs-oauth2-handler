// src/auth/AuthProvider.tsx
import { useState, useEffect, useCallback, useRef, ReactNode } from "react";
import AuthContext from "./AuthContext";
import apiClient from "../api/apiClient";
import { generatePKCE } from "../utils/pkce";

// Função para criar o iframe se ele ainda não existir
function buildIframe(src: string) {
  // Verifica se o iframe já existe
  let iframe = document.getElementById("iframe-oauth2") as HTMLIFrameElement;

  if (!iframe) {
    // Cria o iframe apenas se não existir
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

    // Adiciona o iframe ao corpo da página
    document.body.appendChild(iframe);
  }
  else {
    // Se o iframe já existe, chama showIframe com o src
    showIframe(src);
  }
}

// Função para esconder o iframe
function hideIframe() {
  const iframe = document.getElementById("iframe-oauth2") as HTMLIFrameElement;
  if (iframe) {
    iframe.style.display = "none";
  }
}

// Função para mostrar o iframe e atualizar o src
function showIframe(src: string) {
  const iframe = document.getElementById("iframe-oauth2") as HTMLIFrameElement;
  if (iframe) {
    iframe.style.display = "block"; // Torna o iframe visível
    iframe.src = src; // Atualiza o src do iframe
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
  const [iframeSrc, setIframeSrc] = useState("");
  const [manualLogout, setManualLogout] = useState(false);
  const [loginCompleted, setLoginCompleted] = useState(false);


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

      // Redireciona para a rota salva
      const lastPath = localStorage.getItem("lastPath") || "/";
      localStorage.removeItem("lastPath");
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.replace(lastPath);

    } catch (err: any) {
      console.error("Falha no login:", err.response?.data || err.message);
      buildIframe(iframeSrc);
    }
  }, []);

  // Login
  const login = useCallback(async () => {
    const { codeVerifier, codeChallenge } = await generatePKCE();
    localStorage.setItem("pkce_verifier", codeVerifier);

    const url = `${AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&scope=user&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    setIframeSrc(url);
    buildIframe(iframeSrc);

    const messageListener = (event: MessageEvent) => {
      if (event.origin !== window.origin) return;
      const { code } = event.data as { code?: string };
      if (code) handleCallback(code);
    };

    window.addEventListener("message", messageListener, { once: true });
  }, [handleCallback]);

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
      const currentAuth = authRef.current;
      if (!currentAuth?.expiresIn) {
        buildIframe(iframeSrc);
        return;
      }
      const ageInSeconds = Math.floor((Date.now() - currentAuth.createdAt) / 1000);
      if (currentAuth.expiresIn - ageInSeconds <= REFRESH_TIME) login();
    }, 30000);
    return () => clearInterval(interval);
  }, [login]);

  // Login automático somente se não houver auth e não tiver logout manual
useEffect(() => {
  const storedAuth = localStorage.getItem("auth");
  if (!auth && !manualLogout && !storedAuth && !loginCompleted) {
    login();
  }
}, [auth, manualLogout, loginCompleted, login]);

  // checkLogin: salva rota atual antes de disparar login
  const checkLogin = useCallback((redirectBack: boolean = false) => {
    if (redirectBack) localStorage.setItem("lastPath", window.location.pathname);
    login();
  }, [login]);

  return (
    <AuthContext.Provider value={{ auth, login, logout, handleCallback, checkLogin }}>
      {children}
    </AuthContext.Provider>
  );
}
