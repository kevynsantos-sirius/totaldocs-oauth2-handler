// src/auth/AuthProvider.tsx
import { useState, useEffect, useCallback, useRef, ReactNode } from "react";
import AuthContext from "./AuthContext";
import apiClient from "../api/apiClient";
import { generatePKCE } from "../utils/pkce";

function createIframe(iframeSrc: string) {
  // Verifica se o iframe já existe
  let iframe = document.getElementById("oauth2-iframe");

  // Se o iframe não existir, cria um novo
  if (!iframe) {
    const iframe = document.createElement("iframe");
    iframe.id = "oauth2-iframe"; // Defina um id único para identificar o iframe

    iframe.title = "OAuth Login";
    iframe.src = iframeSrc;
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.left = "0";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.zIndex = "9999";
    iframe.style.background = "white";

    // Adiciona o iframe ao body do documento
    document.body.appendChild(iframe);
  } else {
    console.log("Iframe já existe!");
  }
}


const AUTH_URL = import.meta.env.VITE_OAUTH2_AUTH_URL as string;
const TOKEN_URL = import.meta.env.VITE_OAUTH2_TOKEN_URL as string;
const CLIENT_ID = import.meta.env.VITE_OAUTH2_CLIENT_ID as string;
const REDIRECT_URI = import.meta.env.VITE_OAUTH2_REDIRECT_URI as string;
const REFRESH_TIME = Number(import.meta.env.VITE_OAUTH2_REFRESH_TIME);
const MAIN_APP = import.meta.env.VITE_MAIN_APP as string;

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
  const [iframeSrc, setIframeSrc] = useState("");

  const authRef = useRef(auth);
  useEffect(() => { authRef.current = auth; }, [auth]);

  useEffect(() => {
    if (auth) localStorage.setItem("auth", JSON.stringify(auth));
    else localStorage.removeItem("auth");
  }, [auth]);

  const showIframe = useCallback((visible: boolean) => {
  const iframe = document.getElementById("oauth2-iframe") as HTMLIFrameElement | null;
  if (!iframe)
  {
    createIframe(iframeSrc);
  }
  else
  {
    if(!visible)
    {
      console.log('deixando iframe invisivel');
      document.body.removeChild(iframe);
    }
  }
},[]);

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

    setManualLogout(false);
    setLoginCompleted(true);
    showIframe(false);

    // Obter o último caminho, e verificar se é o padrão "/"
    const lastPathStorage = localStorage.getItem("lastPath");
    const lastPath = (lastPathStorage && lastPathStorage !== "/") 
      ? lastPathStorage 
      : MAIN_APP;

    localStorage.removeItem("lastPath");
    window.history.replaceState({}, document.title, window.location.pathname);
    window.location.replace(lastPath);

  } catch (err: any) {
    console.error("Falha no login:", err.response?.data || err.message);
    showIframe(true);
  }
}, []);

  const login = useCallback(async () => {
    const { codeVerifier, codeChallenge } = await generatePKCE();
    localStorage.setItem("pkce_verifier", codeVerifier);

    const url = `${AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&scope=user&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    setIframeSrc(url);
    localStorage.getItem("auth") ? showIframe(false) : showIframe(true);

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
    setManualLogout(true);
    showIframe(false);
  }, []);

  useEffect(() => {
    const storedAuth = localStorage.getItem("auth");
    if (!auth && !manualLogout && !storedAuth && !loginCompleted) {
      login();
    }
  }, [auth, manualLogout, loginCompleted, login]);

  const checkLogin = useCallback((redirectBack: boolean = false) => {
    if (redirectBack) localStorage.setItem("lastPath", window.location.pathname);
    login();
  }, [login]);

  return (
    <AuthContext.Provider value={{ auth, login, logout, handleCallback, checkLogin, showIframe }}>
      {children}
    </AuthContext.Provider>
  );
}
