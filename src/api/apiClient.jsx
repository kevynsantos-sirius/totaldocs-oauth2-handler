import axios from "axios";

const apiClient = axios.create({
  headers: { "Content-Type": "application/x-www-form-urlencoded" }
});

// Interceptor para adicionar token automaticamente
apiClient.interceptors.request.use((config) => {
  return config;
});

export default apiClient;
