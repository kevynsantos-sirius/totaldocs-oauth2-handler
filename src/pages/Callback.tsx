import React, { useEffect } from 'react';
import { useAuth } from '../auth/AuthContext'; // Certifique-se de importar corretamente o useAuth

const Callback = () => {
  const { handleCallback } = useAuth(); // Agora estamos pegando o handleCallback do contexto de autenticação

  useEffect(() => {
    // Lógica para capturar o código na URL e fazer a troca por token
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      handleCallback(code); // Método que lida com a troca do código por token
    }

    // A lógica de redirecionamento já deve ser tratada em outro lugar, como no OAuth2SessionGuard ou após o login
  }, [handleCallback]);

  return <div>Loading...</div>; // Você pode mostrar um "loading" enquanto a troca do token ocorre
};

export default Callback;
