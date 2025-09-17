import React, { useEffect } from 'react';
import { useAuth } from '../auth/AuthContext'; // Certifique-se de importar corretamente o useAuth

interface CallbackProps {
  navigate: (path: string) => void; // Define o tipo para o navigate
}

const Callback: React.FC<CallbackProps> = ({ navigate }) => {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const { handleCallback } = useAuth(); // Agora estamos pegando o handleCallback do contexto de autenticação
    
    if (code) {
      handleCallback(code); // Método que lida com a troca do código por token
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

  return <div>Loading...</div>;
};

export default Callback;
