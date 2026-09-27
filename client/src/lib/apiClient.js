import axios from "axios";
export const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1", withCredentials: true });
let csrfToken;
export function setCsrfToken(value) { csrfToken = value; }
apiClient.interceptors.request.use(config => {
  if (csrfToken && !["get", "head", "options"].includes(config.method)) config.headers["X-CSRF-Token"] = csrfToken;
  return config;
});
apiClient.interceptors.response.use(response => response, error => {
  error.message = error.response?.data?.message || "Cannot reach CampusFlow. Please check your connection and try again.";
  return Promise.reject(error);
});
export async function api(path, options = {}) {
  const response = await apiClient({ url: path, ...options });
  return response.data;
}
