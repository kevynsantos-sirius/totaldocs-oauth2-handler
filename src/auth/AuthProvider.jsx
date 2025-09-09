import { useState, useEffect, useCallback } from "react";
import AuthContext from "./AuthContext";
import apiClient from "../api/apiClient";

const AUTH_URL = import.meta.env.VITE_OAUTH2_AUTH_URL;
const TOKEN_URL = import.meta.env.VITE_OAUTH2_TOKEN_URL;
const CLIENT_ID = import.meta.env.VITE_OAUTH2_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_OAUTH2_REDIRECT_URI;

export default function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const stored = localStorage.getItem("auth");
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (auth) localStorage.setItem("auth", JSON.stringify(auth));
    else localStorage.removeItem("auth");
  }, [auth]);

  const login = () => {
    const url = `${AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&scope=openid profile email`;
    window.location.href = url;
  };

  const handleCallback = useCallback(async (code) => {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID
    });

    const response = await apiClient.post(TOKEN_URL, body);

    setAuth({
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in
    });
  }, []);

  const refreshToken = useCallback(async () => {
    if (!auth?.refreshToken) return;

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: auth.refreshToken,
      client_id: CLIENT_ID
    });

    try {
      const response = await apiClient.post(TOKEN_URL, body);
      setAuth((prev) => ({
        ...prev,
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in
      }));
    } catch (err) {
      console.error("Falha ao renovar token", err);
      setAuth(null);
    }
  }, [auth]);

  useEffect(() => {
    if (!auth?.expiresIn) return;
    const interval = setInterval(() => {
      refreshToken();
    }, (auth.expiresIn - 60) * 1000); // renova 1 min antes de expirar
    return () => clearInterval(interval);
  }, [auth, refreshToken]);

  const logout = () => setAuth(null);

  return (
    <AuthContext.Provider value={{ auth, login, logout, handleCallback }}>
      {children}
    </AuthContext.Provider>
  );
}
