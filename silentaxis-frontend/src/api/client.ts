import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 20_000,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const code = err?.code as string | undefined;
    const url = (err?.config?.url as string | undefined) ?? "unknown endpoint";
    if (code === "ECONNABORTED") {
      return Promise.reject(new Error(`Request timeout at ${url}`));
    }
    const message =
      err?.response?.data?.error ??
      err?.response?.data?.message ??
      err?.message ??
      "Request failed";
    return Promise.reject(new Error(String(message)));
  }
);

