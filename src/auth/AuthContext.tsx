import React, { createContext, useContext, useState, useCallback } from 'react';

// Definição do tipo Auth
interface Auth {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  createdAt: number;
}

interface AuthContextType {
  auth: Auth | null;
  handleCallback: (code: string) => void;
}


const CLIENT_ID = import.meta.env.VITE_OAUTH2_CLIENT_ID as string;
const REDIRECT_URI = import.meta.env.VITE_OAUTH2_REDIRECT_URI as string;
const TOKEN_URL = import.meta.env.VITE_OAUTH2_TOKEN_URL as string;

// Criar o contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [auth, setAuth] = useState<Auth | null>(null);

const handleCallback = useCallback(async (code: string) => {
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

    setAuth(newAuth); // Atualiza o estado de autenticação
    localStorage.setItem('auth', JSON.stringify(newAuth)); // Salva no localStorage

  } catch (error) {
    console.error('Erro ao trocar o código por token:', error);
  }
}, []);

  return (
    <AuthContext.Provider value={{ auth, handleCallback }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;  // Certifique-se de exportar como default