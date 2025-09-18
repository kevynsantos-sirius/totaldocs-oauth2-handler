import React, { useEffect, useState } from 'react';
import { generatePKCE } from '../utils/pkce';

// Tipos para o estado de autenticação
interface Auth {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  createdAt: number;
}

interface OAuth2SessionGuardProps {
  ComponentToRender: React.ComponentType; // O componente a ser renderizado quando o token for válido
}

const AUTH_URL = import.meta.env.VITE_OAUTH2_AUTH_URL as string;
const TOKEN_URL = import.meta.env.VITE_OAUTH2_TOKEN_URL as string;
const CLIENT_ID = import.meta.env.VITE_OAUTH2_CLIENT_ID as string;
const REDIRECT_URI = import.meta.env.VITE_OAUTH2_REDIRECT_URI as string;

const OAuth2SessionGuard: React.FC<OAuth2SessionGuardProps> = ({ ComponentToRender }) => {
  const [auth, setAuth] = useState<Auth | null>(null); // Estado de autenticação
  const [isTokenExpired, setTokenExpired] = useState<boolean>(false); // Estado de expiração do token

  const checkTokenExpiration = () => {
    const storedAuth = localStorage.getItem('auth');
    if (storedAuth) {
      const parsedAuth: Auth = JSON.parse(storedAuth);
      const isExpired = Date.now() - parsedAuth.createdAt > parsedAuth.expiresIn * 1000;
      if (isExpired) {
        setTokenExpired(true);
        localStorage.removeItem('auth'); // Remove token expirado
      } else {
        setAuth(parsedAuth);
        setTokenExpired(false);
      }
    }
    const sessionExpired = localStorage.getItem("sessionExpired");
    if(sessionExpired) {
      setTokenExpired(true);
      localStorage.removeItem('auth'); // Remove token expirado
    }
  };

  useEffect(() => {
    checkTokenExpiration();
    const timeout = setInterval(checkTokenExpiration, 30000);

    return () => {
      clearInterval(timeout);
    };
  }, []);

  useEffect(() => {
    const generateCodeVerifier = async () => {
      const { codeVerifier, codeChallenge } = await generatePKCE();
      localStorage.setItem("codeVerifier", codeVerifier);
      localStorage.setItem("codeChallenge", codeChallenge);
    };

    if (!auth || isTokenExpired) {
      generateCodeVerifier();
      localStorage.setItem('lastPath', window.location.pathname);
      if (!localStorage.getItem('firstLogin')) {
        localStorage.setItem('firstLogin', 'true');
      }
    }
  }, [auth, isTokenExpired]);

  if (!auth || isTokenExpired) {
    return (
      <iframe
        src={`${AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=user&code_challenge=${encodeURIComponent(localStorage.getItem("codeChallenge") || "")}&code_challenge_method=S256`}
        title="OAuth2 Login"
        style={{
          width: '100vw',
          height: '100vh',
          border: 'none',
        }}
      />
    );
  }

  return <ComponentToRender />;
};

export default OAuth2SessionGuard;
