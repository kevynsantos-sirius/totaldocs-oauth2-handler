import { useState, useEffect, useCallback, ReactNode, useRef } from "react";
import AuthContext from "./AuthContext";
import apiClient from "../api/apiClient";
import { generatePKCE } from "../utils/pkce";

// Função para criar o iframe, se não existir
function createIframe(iframeSrc: string) {
  let iframe = document.getElementById("oauth2-iframe") as HTMLIFrameElement | null;

  // Se o iframe não existir, cria um novo
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "oauth2-iframe"; // Define um id único para identificar o iframe

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
    // Se o iframe já existir, apenas atualize o src
    iframe.src = iframeSrc;
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
  const [iframeSrc, setIframeSrc] = useState(""); // URL do iframe

  const authRef = useRef(auth);
  useEffect(() => { authRef.current = auth; }, [auth]);

  useEffect(() => {
    if (auth) localStorage.setItem("auth", JSON.stringify(auth));
    else localStorage.removeItem("auth");
  }, [auth]);

  const showIframe = useCallback((visible: boolean, iframeSrc: string) => {
    const iframe = document.getElementById("oauth2-iframe") as HTMLIFrameElement | null;

    if (!iframe && visible) {
      createIframe(iframeSrc);  // Criar o iframe se ele não existir
    } else if (iframe && !visible) {
      // Remover o iframe quando invisível
      console.log('Deixando iframe invisível');
      document.body.removeChild(iframe);
    } else if (iframe && visible) {
      // Exibir o iframe, caso já exista
      iframe.style.visibility = "visible";
      iframe.style.pointerEvents = "auto";
      iframe.style.opacity = "1";
    }
  }, []); // Não dependa de iframeSrc aqui

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
      showIframe(false, ""); // Esconde o iframe após o login

      const lastPathStorage = localStorage.getItem("lastPath");
      const lastPath = (lastPathStorage && lastPathStorage !== "/") 
        ? lastPathStorage 
        : MAIN_APP;

      localStorage.removeItem("lastPath");
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.replace(lastPath);

    } catch (err: any) {
      console.error("Falha no login:", err.response?.data || err.message);
      showIframe(true, iframeSrc); // Reexibe o iframe em caso de erro
    }
  }, [showIframe]); // Aqui ainda mantém `iframeSrc`, mas não é alterado dentro da função

  const login = useCallback(async () => {
    if (loginCompleted) return;  // Evita chamadas repetidas se já foi concluído

    const { codeVerifier, codeChallenge } = await generatePKCE();
    localStorage.setItem("pkce_verifier", codeVerifier);

    const url = `${AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&scope=user&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    setIframeSrc(url); // Atualiza o src do iframe
    localStorage.getItem("auth") ? showIframe(false, "") : showIframe(true, url);

    const messageListener = (event: MessageEvent) => {
      if (event.origin !== window.origin) return;
      const { code } = event.data as { code?: string };
      if (code) handleCallback(code);
    };

    window.addEventListener("message", messageListener, { once: true });
  }, [handleCallback, showIframe, loginCompleted]); // Evitar loop de re-execução

  const logout = useCallback(() => {
    localStorage.removeItem("auth");
    localStorage.removeItem("pkce_verifier");
    setAuth(null);
    setManualLogout(true);
    showIframe(false, ""); // Remove o iframe após logout
  }, [showIframe]);

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
