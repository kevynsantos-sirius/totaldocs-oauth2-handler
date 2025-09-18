import React, { useEffect, useState } from 'react';
import { NavigateFunction } from 'react-router-dom'; // Importando o tipo correto para o navigate

interface CallbackProps {
  navigate: NavigateFunction; // Usando o tipo correto para o navigate
}

const CLIENT_ID = import.meta.env.VITE_OAUTH2_CLIENT_ID as string;
const REDIRECT_URI = import.meta.env.VITE_OAUTH2_REDIRECT_URI as string;
const TOKEN_URL = import.meta.env.VITE_OAUTH2_TOKEN_URL as string;

interface Auth {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  createdAt: number;
}

const Callback: React.FC<CallbackProps> = ({ navigate }) => {
  const [error, setError] = useState<string | null>(null); // Estado para lidar com erros

  useEffect(() => {
    const fetchToken = async (code: string) => {
      try {
        const response = await fetch(TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
            client_id: CLIENT_ID,
            code_verifier: localStorage.getItem("codeVerifier"),
          }),
        });

        if (!response.ok) {
          throw new Error('Falha na requisição para trocar o código por token');
        }

        const data = await response.json();

        const newAuth: Auth = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in,
          createdAt: Date.now(),
        };

        localStorage.setItem('auth', JSON.stringify(newAuth)); // Salva no localStorage
        // Não navega até que o processo de autenticação seja bem-sucedido

      } catch (error) {
        console.error('Erro ao trocar o código por token:', error);
        setError('Erro na autenticação. Tente novamente.'); // Define o erro para mostrar ao usuário
      }
    };

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      fetchToken(code); // Chama a função assíncrona
    }

    const firstLogin = localStorage.getItem('firstLogin');
    // Remove 'sessionExpired' após o login bem-sucedido
    localStorage.removeItem('sessionExpired');
    if (firstLogin === 'true') {
      localStorage.setItem('firstLogin', 'false');
      navigate('/');  // Redireciona para a home se for o primeiro login
    } else {
      const lastPath = localStorage.getItem('lastPath');
      if (lastPath) {
        navigate(lastPath);  // Redireciona para a última página visitada
      }
    }
  }, [navigate]);

  // Se houver erro, exibe a mensagem de erro
  if (error) {
    return <div>{error}</div>;
  }

  return <div>Loading...</div>;
};

export default Callback;
