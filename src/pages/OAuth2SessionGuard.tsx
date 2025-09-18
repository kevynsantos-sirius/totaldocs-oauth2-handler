import React, { useState, useEffect } from 'react';
import { generatePKCE } from '../utils/pkce'; // Assumindo que você tem o PKCE gerado
import axios from 'axios';

const AUTH_URL = import.meta.env.VITE_OAUTH2_AUTH_URL as string;
const TOKEN_URL = import.meta.env.VITE_OAUTH2_TOKEN_URL as string;
const CLIENT_ID = import.meta.env.VITE_OAUTH2_CLIENT_ID as string;
const REDIRECT_URI = import.meta.env.VITE_OAUTH2_REDIRECT_URI as string;

interface Auth {
  accessToken: string;   // Token de acesso gerado após a autenticação
  refreshToken: string;  // Token de atualização, usado para renovar o accessToken quando expirar
  expiresIn: number;     // Tempo de expiração do accessToken em segundos
  createdAt: number;     // Timestamp (em milissegundos) de quando o token foi gerado
}


const OAuth2SessionGuard: React.FC<any> = ({ ComponentToRender }) => {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [isTokenExpired, setTokenExpired] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const checkTokenExpiration = () => {
    const storedAuth = localStorage.getItem('auth');
    if (storedAuth) {
      const parsedAuth: Auth = JSON.parse(storedAuth);
      const isExpired = Date.now() - parsedAuth.createdAt > parsedAuth.expiresIn * 1000;
      if (isExpired) {
        setTokenExpired(true);
        localStorage.removeItem('auth');
      } else {
        setAuth(parsedAuth);
        setTokenExpired(false);
      }
    }
  };

  const fetchToken = async (code: string) => {
    try {
      const response = await axios.post(TOKEN_URL, {
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier: localStorage.getItem("codeVerifier"),
      });

      const data = response.data;
      const newAuth: Auth = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        createdAt: Date.now(),
      };

      localStorage.setItem('auth', JSON.stringify(newAuth));
      setAuth(newAuth); // Atualiza o estado com o novo token
    } catch (error) {
      console.error('Erro ao trocar o código por token:', error);
      setError('Erro na autenticação. Tente novamente.');
    }
  };

  useEffect(() => {
    checkTokenExpiration();

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      fetchToken(code); // Chama a função para buscar o token
    }

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

  if (error) {
    return <div>{error}</div>;
  }

  // Se o token não estiver válido ou estiver expirado, exibe o iframe para login
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

  // Renderiza o componente principal se o token estiver válido
  return <ComponentToRender />;
};

export default OAuth2SessionGuard;
