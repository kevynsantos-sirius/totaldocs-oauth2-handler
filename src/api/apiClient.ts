import axios from "axios";
import type { AxiosInstance } from "axios";

const apiClient: AxiosInstance = axios.create({
  baseURL: "/", // Você pode ajustar para a URL base da sua API
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
});

export default apiClient;
