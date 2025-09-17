import axios, { AxiosInstance } from "axios";
import authInterceptor from "./authInterceptor"; // Importa a função do interceptor

// Criação da instância do Axios
const apiClient: AxiosInstance = axios.create({
  baseURL: "/", // A URL base da sua API, você pode ajustar conforme necessário
  headers: {
    "Content-Type": "application/x-www-form-urlencoded", // Definindo o tipo de conteúdo das requisições
  },
  timeout: 10000, // Tempo limite para a requisição (em milissegundos)
});

// Aplica o interceptor de autenticação
authInterceptor(apiClient);

export default apiClient;
