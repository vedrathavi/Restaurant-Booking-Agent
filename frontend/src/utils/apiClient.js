import { HOST } from "../config/constants.js";
import axios from "axios";

// Fallback: if VITE_SERVER_URL wasn't provided at build time, use relative URLs
// This allows the frontend to call same-origin backend when deployed behind
// a single host (or during local dev without an explicit host).
const baseURL = HOST || "";
if (!HOST && typeof window !== "undefined") {
  console.warn(
    "VITE_SERVER_URL is not set — API client will use relative URLs (baseURL='')"
  );
}

const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;
