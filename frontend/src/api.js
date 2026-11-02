import axios from "axios";

// Automatically use the production backend URL if configured, otherwise fallback to local port 3000
const rawBaseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
const cleanBaseURL = rawBaseURL.endsWith("/") ? rawBaseURL.slice(0, -1) : rawBaseURL;

const API = axios.create({
  baseURL: cleanBaseURL,
  withCredentials: true,
});

// Optional request interceptor to attach bearer token in header as backup
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor to handle session timeouts
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized, clear local session data
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_data");
      
      // Only redirect if not already on login/register page
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/register") {
        window.location.href = "/login?session_expired=true";
      }
    }
    return Promise.reject(error);
  }
);

export default API;
