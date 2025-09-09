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
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (auth) localStorage.setItem("auth", JSON.stringify(auth));
    else localStorage.removeItem("auth");
  }, [auth]);

  const login = async () => {
    const { codeVerifier, codeChallenge } = await generatePKCE();

    // Salvar code_verifier em localStorage (vai precisar no /token)
    localStorage.setItem("pkce_verifier", codeVerifier);

    const url = `${AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&scope=user&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    window.location.href = url;
  };

  const handleCallback = useCallback(async (code) => {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: localStorage.getItem("pkce_verifier")
    });

    const response = await apiClient.post(TOKEN_URL, body);

    setAuth({
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in
    });
  }, []);

  const logout = () => setAuth(null);

  return (
    <AuthContext.Provider value={{ auth, login, logout, handleCallback }}>
      {children}
    </AuthContext.Provider>
  );
}
