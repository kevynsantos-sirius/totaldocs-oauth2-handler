import axios, { AxiosInstance } from "axios";

// Criação da instância do Axios
const apiClient: AxiosInstance = axios.create({
  baseURL: "/", // A URL base da sua API, você pode ajustar conforme necessário
  headers: {
    "Content-Type": "application/x-www-form-urlencoded", // Definindo o tipo de conteúdo das requisições
  },
  timeout: 10000, // Tempo limite para a requisição (em milissegundos)
});

// Interceptor de resposta para verificar o status 401
apiClient.interceptors.response.use(
  (response) => response, // Se a resposta for bem-sucedida, apenas retorna a resposta
  (error) => {
    if (error.response && error.response.status === 401) {
      // Se o status for 401 (não autorizado), armazena o atributo 'sessionExpired' no localStorage
      localStorage.setItem("sessionExpired", "true");

      // Redireciona para a página inicial
      window.location.href = "/";
    }

    // Retorna a promessa rejeitada para que o código que chamou a requisição possa lidar com o erro
    return Promise.reject(error);
  }
);

export default apiClient;
