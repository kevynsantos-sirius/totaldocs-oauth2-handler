// src/auth/AuthProvider.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import AuthContext from "./AuthContext";
import apiClient from "../api/apiClient";
import { generatePKCE } from "../utils/pkce";

const AUTH_URL = import.meta.env.VITE_OAUTH2_AUTH_URL;
const TOKEN_URL = import.meta.env.VITE_OAUTH2_TOKEN_URL;
const CLIENT_ID = import.meta.env.VITE_OAUTH2_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_OAUTH2_REDIRECT_URI;
const REFRESH_TIME = import.meta.env.VITE_OAUTH2_REFRESH_TIME;

export default function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
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

  const authRef = useRef(auth);
  useEffect(() => {
    authRef.current = auth;
  }, [auth]);

  useEffect(() => {
    if (auth) localStorage.setItem("auth", JSON.stringify(auth));
    else localStorage.removeItem("auth");
  }, [auth]);

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
      setManualLogout(false);
      console.log("✅ Login efetuado com sucesso (monitorando, sem redirect)");
    } catch (err) {
      console.error("❌ Falha no login:", err.response?.data || err.message);
      setShowIframe(true);
    }
  }, []);

  const login = useCallback(async () => {
    const { codeVerifier, codeChallenge } = await generatePKCE();
    localStorage.setItem("pkce_verifier", codeVerifier);

    const url = `${AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&scope=user&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    setIframeSrc(url);
    setShowIframe(true);

    const messageListener = (event) => {
      if (event.origin !== window.origin) return;
      const { code } = event.data;
      if (code) handleCallback(code);
    };

    window.addEventListener("message", messageListener, { once: true });
  }, [handleCallback]);

  const logout = useCallback(() => {
    setAuth(null);
    setShowIframe(false);
    setManualLogout(true);
    console.log("🚪 Logout efetuado");
  }, []);

  // Intervalo para monitorar token
  useEffect(() => {
    const interval = setInterval(() => {
      const currentAuth = authRef.current;
      console.log("⏱️ Intervalo executado:", new Date().toLocaleTimeString());

      if (!currentAuth?.expiresIn) {
        // Sem sessão ativa, mostra iframe de login
        setShowIframe(true);
        return;
      }

      const ageInSeconds = Math.floor((Date.now() - currentAuth.createdAt) / 1000);
      console.log(`🔍 Checando token: idade ${ageInSeconds}s (expira em ${currentAuth.expiresIn}s)`);

      if (currentAuth.expiresIn - ageInSeconds <= REFRESH_TIME) {
        console.log("⚠️ Token expirando, forçando login novamente...");
        login(); // força login PKCE via iframe
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [login]);

  // Login automático só se não houver sessão
  useEffect(() => {
    if (!auth && !manualLogout) login();
  }, [auth, manualLogout, login]);

  const checkLogin = useCallback(() => {
    login(); // sempre dispara login, independente do auth atual
  }, [login]);

  return (
    <AuthContext.Provider value={{ auth, login, logout, handleCallback, checkLogin }}>
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
