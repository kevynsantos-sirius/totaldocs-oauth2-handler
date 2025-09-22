import { useState, useEffect } from "react";
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



const OAuth2SessionGuard: React.FC<OAuth2SessionGuardProps> = ({ ComponentToRender, navigate }) => {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [isTokenExpired, setTokenExpired] = useState(false);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkTokenExpiration = () => {
    const storedAuth = localStorage.getItem("auth");
    if (storedAuth) {
      const parsedAuth: Auth = JSON.parse(storedAuth);
      const isExpired =
        Date.now() - parsedAuth.createdAt > parsedAuth.expiresIn * 1000;
      const tokenExpired = localStorage.getItem("sessionExpired");
      if (isExpired || tokenExpired) {
        setTokenExpired(true);
        localStorage.removeItem("auth");
      } else {
        setAuth(parsedAuth);
        setTokenExpired(false);
        setIsAuthenticated(true);
      }
    }
  };

  const fetchToken = async (code: string) => {
    try {
      const codeVerifier = localStorage.getItem("codeVerifier");
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier: codeVerifier || "",
      });

      const response = await apiClient.post(TOKEN_URL, body);
      const data = response.data;

      const newAuth: Auth = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        createdAt: Date.now(),
      };

      localStorage.setItem("auth", JSON.stringify(newAuth));
      setAuth(newAuth);
      setIsAuthenticated(true);

      // Limpa flag do iframe
      localStorage.removeItem("iframeShown");

      // Redireciona para o último caminho salvo ou /
      const lastPath = localStorage.getItem("lastPath") || "/";
      navigate(lastPath, { replace: true });
    } catch (error) {
      console.error("Erro ao trocar o código por token:", error);
      setError("Erro na autenticação. Tente novamente.");
    }
  };

  useEffect(() => {
    if (!window.location.href.includes("/callback")) {
      checkTokenExpiration();
    }

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    if (code) {
      fetchToken(code);
    }
  }, []);

  useEffect(() => {
    const generateCodeVerifier = async () => {
      await generatePKCE();
    };

    if (!auth || isTokenExpired) {
      localStorage.setItem("lastPath", window.location.pathname);
      if (!localStorage.getItem("firstLogin")) {
        localStorage.setItem("firstLogin", "true");
      }
      generateCodeVerifier();
    }
  }, [auth, isTokenExpired]);

  if (error.length > 0) {
    return <div>{error}</div>;
  }


  const iframeShown = localStorage.getItem("iframeShown");

  return (
    <>
      {(!isAuthenticated || isTokenExpired) && !iframeShown ? (
        <iframe
          key="oauth-iframe"
          src={`${AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
            REDIRECT_URI
          )}&scope=user&code_challenge=${encodeURIComponent(
            localStorage.getItem("codeChallenge") || ""
          )}&code_challenge_method=S256`}
          title="OAuth2 Login"
          style={{
            width: "100vw",
            height: "100vh",
            border: "none",
          }}
        />
      ) : (
        <ComponentToRender key="main-app" />
      )}
    </>
  );
};

export default OAuth2SessionGuard;
