import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import generatePKCE from '../utils/pkce'; // Assumindo que você tem o PKCE gerado

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

const OAuth2SessionGuard: React.FC<any> = ({ ComponentToRender }) => {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [isTokenExpired, setTokenExpired] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false); // Novo estado para verificar autenticação

  const checkTokenExpiration = () => {
    const storedAuth = localStorage.getItem('auth');
    if (storedAuth) {
      const parsedAuth: Auth = JSON.parse(storedAuth);
      const isExpired = Date.now() - parsedAuth.createdAt > parsedAuth.expiresIn * 1000;
      const tokenExpired = localStorage.getItem("sessionExpired");
      if (isExpired || tokenExpired) {
        setTokenExpired(true);
        localStorage.removeItem('auth');  // Remove o token expirado
      } else {
        setAuth(parsedAuth);
        setTokenExpired(false);
        setIsAuthenticated(true); // Marca como autenticado
      }
    }
  };

  const fetchToken = async (code: string) => {
    try {
      const codeVerifier = localStorage.getItem("codeVerifier");
      console.log(codeVerifier);
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier: codeVerifier || '',
      });
      const response = await apiClient.post(TOKEN_URL, body);

      const data = response.data;
      const newAuth: Auth = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        createdAt: Date.now(),
      };

      localStorage.setItem('auth', JSON.stringify(newAuth));
      setAuth(newAuth); // Atualiza o estado com o novo token
      setIsAuthenticated(true); // Marca como autenticado
    } catch (error) {
      console.error('Erro ao trocar o código por token:', error);
      setError('Erro na autenticação. Tente novamente.');
    }
  };

  useEffect(() => {

    if(!window.location.href.includes("/callback")) {
      checkTokenExpiration(); // Verifica se o token está expirado
    }
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      fetchToken(code); // Chama a função para buscar o token
    }

    const timeout = setInterval(checkTokenExpiration, 30000);  // Checa a cada 30 segundos
    return () => {
      clearInterval(timeout);  // Limpa o intervalo quando o componente desmonta
    };
  }, []);

  useEffect(() => {
    const generateCodeVerifier = async () => {
       await generatePKCE();
    };

    // Se não houver autenticação ou o token estiver expirado, gera o codeVerifier
    if (!auth || isTokenExpired) {
      //generateCodeVerifier();
      localStorage.setItem('lastPath', window.location.pathname);  // Salva o último caminho acessado
      if (!localStorage.getItem('firstLogin')) {
        localStorage.setItem('firstLogin', 'true');  // Marca o primeiro login
      }
    }
  }, [auth, isTokenExpired]);

  if (error) {
    return <div>{error}</div>;
  }

  // Verifica se o iframe já foi exibido
  const iframeShown = localStorage.getItem('iframeShown');

  // Se o token não estiver válido ou estiver expirado, e o iframe não foi exibido antes
  if ((!isAuthenticated || isTokenExpired) && !iframeShown) {
    localStorage.setItem('iframeShown', 'true');  // Marca que o iframe foi exibido
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

  if(!localStorage.getItem("auth"))
  {
    return <></>;
  }

  // Renderiza o componente principal se o token estiver válido
  return <ComponentToRender />;
};

export default OAuth2SessionGuard;
