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
  const [codeChallengeSave, setCodeChallengeSave] = useState<string>(''); // Armazenar o code_verifier
  // Função para verificar se o token está expirado
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
    if(sessionExpired)
    {
      setTokenExpired(true);
      localStorage.removeItem('auth'); // Remove token expirado
    }
  };

  useEffect(() => {
    checkTokenExpiration();

    // Configuração do timeout para verificar expiração a cada 30 segundos
    const timeout = setInterval(checkTokenExpiration, 30000);

    return () => {
      clearInterval(timeout); // Limpar o timeout quando o componente for desmontado
    };
  }, []);

  // Gerar code_verifier e code_challenge quando necessário
  useEffect(() => {
    const generateCodeVerifier = async () => {
      const { codeVerifier, codeChallenge } = await generatePKCE();
      localStorage.setItem("codeVerifier",codeVerifier);
      setCodeChallengeSave(codeChallenge);
    };

    if (!auth || isTokenExpired) {
      generateCodeVerifier();
      // Armazenar a URL da última página acessada antes de redirecionar para o login
      localStorage.setItem('lastPath', window.location.pathname);
      // Verifica se é o primeiro login
      if (!localStorage.getItem('firstLogin')) {
        localStorage.setItem('firstLogin', 'true');
      }
    }
  }, [auth, isTokenExpired]);

  // Sempre que o caminho mudar, atualiza o 'lastPath' no localStorage
  useEffect(() => {
    const updateLastPath = () => {
      localStorage.setItem('lastPath', window.location.pathname);
    };

    window.addEventListener('popstate', updateLastPath); // Isso irá capturar as mudanças de navegação
    return () => {
      window.removeEventListener('popstate', updateLastPath);
    };
  }, []);

  // Se o token não estiver disponível ou estiver expirado, exibe o iframe para login
if (!auth || isTokenExpired) {
  return (
    <iframe
      src={`${AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=user&code_challenge=${encodeURIComponent(codeChallengeSave)}&code_challenge_method=S256`}
      title="OAuth2 Login"
      style={{
        width: '100vw',  // Largura 100% da tela
        height: '100vh', // Altura 100% da tela
        border: 'none',  // Remover borda, se desejado
      }}
    />
  );
}

  // Renderiza o componente recebido como parâmetro caso o token seja válido
  return <ComponentToRender />;
};

export default OAuth2SessionGuard;
