import apiClient from "./api";
export type User = {
  id?: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at?: string;
  full_name?: string | null;
  phone?: string | null;
  customer_account_id?: number | null;
  last_login_at?: string | null;
  is_superuser?: boolean;
};
export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: User;
};
const TOKEN_KEYS = ["accessToken", "access_token"] as const;
export function getAccessToken(): string | null {
  for (const key of TOKEN_KEYS) {
    const token = localStorage.getItem(key)?.trim();
    if (token) return token;
  }
  return null;
}
export function clearAuthSession() {
  TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem("currentUser");
}
export const authService = {
  async login(
    email: string,
    password: string,
    rememberMe = false,
  ): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/api/auth/login", {
      email,
      password,
      remember_me: rememberMe,
    });
    localStorage.setItem("accessToken", response.access_token);
    localStorage.setItem("access_token", response.access_token);
    localStorage.setItem("currentUser", JSON.stringify(response.user));
    return response;
  },
  async me(): Promise<User> {
    const user = await apiClient.get<User>("/api/auth/me");
    localStorage.setItem("currentUser", JSON.stringify(user));
    return user;
  },
  async register(userData: {
    username: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<AuthResponse> {
    await apiClient.post<User>("/api/auth/register", userData);
    return this.login(userData.email, userData.password);
  },
  async forgotPassword(email: string): Promise<any> {
    return apiClient.post("/api/auth/forgot-password", { email });
  },
  isAuthenticated(): boolean {
    return !!getAccessToken() && !!this.getCurrentUser();
  },
  getCurrentUser(): User | null {
    const storedUser = localStorage.getItem("currentUser");
    if (!storedUser) return null;
    try {
      return JSON.parse(storedUser) as User;
    } catch {
      localStorage.removeItem("currentUser");
      return null;
    }
  },
  async logout() {
    try {
      if (getAccessToken()) await apiClient.post("/api/auth/logout");
    } catch {
      // Local logout must complete even when the API cannot revoke the session.
    } finally {
      clearAuthSession();
    }
  },
};
