import axios from "axios";
import { useAuthStore } from "../store/authStore";

export const api = axios.create({
  baseURL: "http://localhost:4000",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().anonymousToken;
  if (token && config.headers?.["x-requires-anon-token"]) {
    delete config.headers["x-requires-anon-token"];
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const message =
      err?.response?.data?.error ??
      err?.response?.data?.message ??
      err?.message ??
      "Request failed";
    return Promise.reject(new Error(String(message)));
  }
);

