import axios from 'axios';

const API_URL = 'http://localhost:5000/api'; // أو رابط الخیر لديك

export const authService = {
  async login(identifier: string, password: string) {
    const response = await axios.post(`${API_URL}/login`, { identifier, password });
    if (response.data.token) {
      localStorage.setItem('womeed_token', response.data.token);
      localStorage.setItem('womeed_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout() {
    localStorage.removeItem('womeed_token');
    localStorage.removeItem('womeed_user');
    window.location.href = '/login';
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('womeed_user');
    return userStr ? JSON.parse(userStr) : null;
  }
};
