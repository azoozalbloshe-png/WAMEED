
import axios, { AxiosInstance, AxiosError } from "axios";
import { ErrorResponse } from "../types";
import { tr } from "../i18n/runtime";

// Use Vite's same-origin proxy in development to avoid localhost/127.0.0.1 CORS mismatches.
// Set VITE_API_URL only when deploying the frontend separately from the API.
const API_BASE_URL = import.meta.env.DEV
  ? ""
  : import.meta.env.VITE_API_URL || "";

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor to attach token
    this.client.interceptors.request.use((config) => {
      const token =
        localStorage.getItem("accessToken") ||
        localStorage.getItem("access_token");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    });

    // Add response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ErrorResponse>) => {
        if (error.response?.data) {
          if (
            typeof error.response.data.detail !== "string" &&
            error.response.data.detail
          ) {
            error.response.data.detail =
              "Check the required fields, dates and amounts, then try again.";
          }

          if (typeof error.response.data.detail === "string") {
            error.response.data.detail = tr(error.response.data.detail);
          }
        }

        // A stale/expired token makes every protected page look empty or broken.
        // Clear it once and let AuthProvider return the user to the login screen.
        if (
          error.response?.status === 401 &&
          error.config?.headers?.Authorization
        ) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("access_token");
          localStorage.removeItem("currentUser");
          window.dispatchEvent(new Event("wameed:auth-invalid"));
        }

        return Promise.reject(error);
      },
    );
  }

  async get<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export default new ApiClient();
