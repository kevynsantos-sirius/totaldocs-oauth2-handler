import axios from "axios";

const apiClient = axios.create({
  headers: { "Content-Type": "application/x-www-form-urlencoded" }
});

// Interceptor para adicionar token automaticamente
apiClient.interceptors.request.use((config) => {
  const auth = JSON.parse(localStorage.getItem("auth"));
  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

export default apiClient;
