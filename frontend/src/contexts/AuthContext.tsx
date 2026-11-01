import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// 1. واجهة المستخدم
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  is_admin?: boolean;
  avatar?: string;
}

// 2. واجهة السياق
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. مزود السياق (AuthProvider)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // تحقق من وجود المستخدم أو التوكن المخزن محلياً
    const token = localStorage.getItem('access_token');
    if (token) {
      // يمكنك جلب بيانات المستخدم هنا من الـ API إذا لزم الأمر
      setUser({
        id: 1,
        name: 'أحمد العتيبي',
        email: 'admin@wameed.com',
        role: 'admin',
        is_admin: true
      });
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, _password: string) => {
    // منطق تسجيل الدخول
    setUser({
      id: 1,
      name: 'أحمد العتيبي',
      email: email,
      role: 'admin',
      is_admin: true
    });
    localStorage.setItem('access_token', 'mock_token');
  };

const register = async (name: string, email: string, _password: string) => {
    // منطق التسجيل
    setUser({
      id: 2,
      name: name,
      email: email,
      role: 'user',
      is_admin: false
    });
    localStorage.setItem('access_token', 'mock_token');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('access_token');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// 4. هوك useAuth للاستخدام في المكونات
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
