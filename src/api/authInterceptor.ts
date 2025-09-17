// src/interceptors/authInterceptor.ts
import axios, { AxiosInstance } from "axios";

const authInterceptor = (apiClient: AxiosInstance) => {
  apiClient.interceptors.response.use(
    (response) => response, // Se a resposta for bem-sucedida, apenas retorna a resposta
    (error) => {
      if (error.response && error.response.status === 401) {
        // Se o status for 401 (não autorizado), armazena o atributo 'sessionExpired' no localStorage
        localStorage.setItem("sessionExpired", "true");

        // Redireciona para a página inicial
        window.location.href = "/"; // ou qualquer outra ação que você queira realizar
      }

      // Retorna a promessa rejeitada para que o código que chamou a requisição possa lidar com o erro
      return Promise.reject(error);
    }
  );
};

export default authInterceptor;
