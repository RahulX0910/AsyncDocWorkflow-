import ky from "ky";

export const api = ky.create({
  prefixUrl: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 10000,
  credentials: "include",
  headers: {
    Accept: "application/json",
  },
});