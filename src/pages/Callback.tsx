import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { NavigateFunction } from 'react-router-dom';

interface CallbackProps {
  navigate: NavigateFunction;
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar se já há um token no localStorage
    const authData = localStorage.getItem('auth');
    if (authData) {
      const parsedAuth: Auth = JSON.parse(authData);
      const isTokenExpired = Date.now() - parsedAuth.createdAt > parsedAuth.expiresIn * 1000;
      if (!isTokenExpired) {
        navigate('/'); // Direciona para a home caso o token já esteja válido
        return;
      }
    }

    // Função para buscar o token
    const fetchToken = async (code: string) => {
      try {
        const response = await axios.post(TOKEN_URL, {
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
          client_id: CLIENT_ID,
          code_verifier: localStorage.getItem("codeVerifier"),
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.status !== 200) {
          throw new Error('Falha na requisição para trocar o código por token');
        }

        const data = response.data;

        const newAuth: Auth = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in,
          createdAt: Date.now(),
        };

        localStorage.setItem('auth', JSON.stringify(newAuth)); // Salva no localStorage

        navigate('/'); // Redireciona para a home após sucesso

      } catch (error: any) {
        console.error('Erro ao trocar o código por token:', error);
        setError('Erro na autenticação. Tente novamente.'); // Define o erro para mostrar ao usuário
      }
    };

    // Verificar se já existe um código na URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      fetchToken(code); // Chama a função assíncrona para trocar o código por token
    } else {
      // Caso não haja código na URL, redireciona de volta para a home
      navigate('/');
    }

    // Fluxo para redirecionar após o login
    const firstLogin = localStorage.getItem('firstLogin');
    if (firstLogin === 'true') {
      localStorage.setItem('firstLogin', 'false');
      navigate('/');  // Redireciona para a home após o primeiro login
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
