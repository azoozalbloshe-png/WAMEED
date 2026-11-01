import { apiClient } from './api'
import { AuthResponse, LoginData, RegisterData, User } from '../types'

export const authService = {
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/auth/register', data)
    // Store token and user info
    localStorage.setItem('accessToken', response.access_token)
    localStorage.setItem('user', JSON.stringify({
      id: response.user_id,
      email: data.email,
      username: data.username,
      is_active: true,
      created_at: new Date().toISOString(),
    }))
    return response
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const formData = new URLSearchParams()
    formData.append('username', data.email)
    formData.append('password', data.password)

    const response = await apiClient.post<AuthResponse>('/api/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    // Store token
    localStorage.setItem('accessToken', response.access_token)
    localStorage.setItem('user', JSON.stringify({
      id: response.user_id,
      email: data.email,
      username: data.email, // Using email as username
      is_active: true,
      created_at: new Date().toISOString(),
    }))

    return response
  },

  logout(): void {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken')
  },

  getToken(): string | null {
    return localStorage.getItem('accessToken')
  },
}
