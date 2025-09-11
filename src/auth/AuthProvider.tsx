// src/auth/AuthProvider.tsx
import { useState, useEffect, useCallback, useRef, ReactNode } from "react";
import type { Location, NavigateFunction } from "react-router-dom";
import AuthContext from "./AuthContext";
import apiClient from "../api/apiClient";
import { generatePKCE } from "../utils/pkce";

const AUTH_URL = import.meta.env.VITE_OAUTH2_AUTH_URL as string;
const TOKEN_URL = import.meta.env.VITE_OAUTH2_TOKEN_URL as string;
const CLIENT_ID = import.meta.env.VITE_OAUTH2_CLIENT_ID as string;
const REDIRECT_URI = import.meta.env.VITE_OAUTH2_REDIRECT_URI as string;
const REFRESH_TIME = Number(import.meta.env.VITE_OAUTH2_REFRESH_TIME);

interface AuthData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  createdAt: number;
}

interface AuthProviderProps {
  children: ReactNode;
  location?: Location;
  navigate?: NavigateFunction;
}

export default function AuthProvider({ children, location, navigate }: AuthProviderProps) {
  const [auth, setAuth] = useState<AuthData | null>(() => {
    const stored = localStorage.getItem("auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.createdAt = parsed.createdAt ? Number(parsed.createdAt) : Date.now();
      return parsed;
    }
    return null;
  });

  const [showIframe, setShowIframe] = useState(false);
  const [iframeSrc, setIframeSrc] = useState("");
  const [manualLogout, setManualLogout] = useState(false);
  const [lastPath, setLastPath] = useState<string | null>(null);
  const [shouldRedirectAfterLogin, setShouldRedirectAfterLogin] = useState(false);

  const currentLocation = location ?? { pathname: "/" };
  const currentNavigate = navigate ?? (() => {});

  const authRef = useRef(auth);
  useEffect(() => { authRef.current = auth; }, [auth]);

  useEffect(() => {
    if (auth) localStorage.setItem("auth", JSON.stringify(auth));
    else localStorage.removeItem("auth");
  }, [auth]);

  const handleCallback = useCallback(
    async (code: string) => {
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
        setShowIframe(false);
        setManualLogout(false);

        if (shouldRedirectAfterLogin && lastPath) {
          currentNavigate(lastPath, { replace: true });
          setShouldRedirectAfterLogin(false);
          setLastPath(null);
        }
      } catch (err: any) {
        console.error("Falha no login:", err.response?.data || err.message);
        setShowIframe(true);
      }
    },
    [lastPath, shouldRedirectAfterLogin, currentNavigate]
  );

  const login = useCallback(async () => {
    const { codeVerifier, codeChallenge } = await generatePKCE();
    localStorage.setItem("pkce_verifier", codeVerifier);

    const url = `${AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&scope=user&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    setIframeSrc(url);
    setShowIframe(true);

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
    setShowIframe(false);
    setManualLogout(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentAuth = authRef.current;
      if (!currentAuth?.expiresIn) {
        setShowIframe(true);
        return;
      }
      const ageInSeconds = Math.floor((Date.now() - currentAuth.createdAt) / 1000);
      if (currentAuth.expiresIn - ageInSeconds <= REFRESH_TIME) login();
    }, 30000);
    return () => clearInterval(interval);
  }, [login]);

  useEffect(() => {
    if (!auth && !manualLogout) login();
  }, [auth, manualLogout, login]);

  const checkLogin = useCallback(
    (redirectBack: boolean = false) => {
      if (redirectBack) {
        setLastPath(currentLocation.pathname);
        setShouldRedirectAfterLogin(true);
      }
      login();
    },
    [currentLocation.pathname, login]
  );

  return (
    <AuthContext.Provider
      value={{ auth, login, logout, handleCallback, checkLogin }}
    >
      {children}
      {showIframe && (
        <iframe
          src={iframeSrc}
          title="OAuth Login"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: "none",
            zIndex: 9999,
            background: "white",
          }}
        />
      )}
    </AuthContext.Provider>
  );
}
