import axios, { AxiosHeaders } from "axios";

let accessToken: string | null = null;

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const headers = AxiosHeaders.from(config.headers);

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  config.headers = headers;
  return config;
});

export function setApiAccessToken(token: string | null) {
  accessToken = token;
}

export { api };
