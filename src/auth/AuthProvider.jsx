// src/auth/AuthProvider.jsx
import { useState, useEffect, useCallback } from "react";
import AuthContext from "./AuthContext";
import apiClient from "../api/apiClient";
import { generatePKCE } from "../utils/pkce";

const AUTH_URL = import.meta.env.VITE_OAUTH2_AUTH_URL;
const TOKEN_URL = import.meta.env.VITE_OAUTH2_TOKEN_URL;
const CLIENT_ID = import.meta.env.VITE_OAUTH2_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_OAUTH2_REDIRECT_URI;

export default function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const stored = localStorage.getItem("auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.createdAt = parsed.createdAt || Date.now();
      return parsed;
    }
    return null;
  });

  const [showIframe, setShowIframe] = useState(false);
  const [iframeSrc, setIframeSrc] = useState("");
  const [manualLogout, setManualLogout] = useState(false);

  // Persistência do auth
  useEffect(() => {
    if (auth) localStorage.setItem("auth", JSON.stringify(auth));
    else localStorage.removeItem("auth");
  }, [auth]);

  // Troca code por token
  const handleCallback = useCallback(async (code) => {
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
      setManualLogout(false); // reset após login bem-sucedido
    } catch (err) {
      console.error("Falha no login:", err);
      setShowIframe(true); // mostra login novamente se falhar
    }
  }, []);

  // Refresh token
  const refreshToken = useCallback(async () => {
    if (!auth?.refreshToken) return;

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: auth.refreshToken,
      client_id: CLIENT_ID,
    });

    try {
      const response = await apiClient.post(TOKEN_URL, body);
      setAuth((prev) => ({
        ...prev,
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in,
        createdAt: Date.now(),
      }));
    } catch (err) {
      console.error("Falha ao renovar token:", err);
      setAuth(null);
      setShowIframe(true); // mostra login novamente
    }
  }, [auth]);

  // Login via iframe
  const login = useCallback(async () => {
    const { codeVerifier, codeChallenge } = await generatePKCE();
    localStorage.setItem("pkce_verifier", codeVerifier);

    const url = `${AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
    )}&scope=user&code_challenge=${codeChallenge}&code_challenge_method=S256`;


    setIframeSrc(url);
    setShowIframe(true);

    // Listener do postMessage
    const messageListener = (event) => {
      if (event.origin !== window.origin) return;
      const { code } = event.data;
      if (code) handleCallback(code);
    };

    window.addEventListener("message", messageListener, { once: true });
  }, [handleCallback]);

  // Logout
  const logout = useCallback(() => {
    setAuth(null);
    setShowIframe(false);
    setManualLogout(true);
  }, []);

  // Intervalo para checar token a cada 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (!auth) return;
      const ageInSeconds = (Date.now() - auth.createdAt) / 1000;
      if (ageInSeconds >= 480) {
        refreshToken();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [auth, refreshToken]);

  // Login automático só se não houver auth e não for logout manual
  useEffect(() => {
    if (!auth && !manualLogout) login();
  }, [auth, manualLogout, login]);

  return (
    <AuthContext.Provider value={{ auth, login, logout, handleCallback }}>
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
