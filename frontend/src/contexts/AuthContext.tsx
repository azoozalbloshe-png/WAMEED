import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  authService,
  clearAuthSession,
  getAccessToken,
  type User,
} from "../services/authService";
// 2. واجهة السياق
interface AuthContextType {
  user: User | null;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<void>;
  register: (
    email: string,
    username: string,
    password: string,
    phone?: string,
  ) => Promise<void>;
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
    const token = getAccessToken();
    if (!token) {
      setIsLoading(false);
    } else {
      authService
        .me()
        .then(setUser)
        .catch(() => {
          clearAuthSession();
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    }
    const handleInvalidSession = () => setUser(null);
    window.addEventListener("wameed:auth-invalid", handleInvalidSession);
    return () =>
      window.removeEventListener("wameed:auth-invalid", handleInvalidSession);
  }, []);
  const login = async (email: string, password: string, rememberMe = false) => {
    const response = await authService.login(email, password, rememberMe);
    setUser(response.user);
  };
  const register = async (
    email: string,
    username: string,
    password: string,
    phone?: string,
  ) => {
    const response = await authService.register({
      email,
      username,
      password,
      phone: phone || undefined,
    });
    setUser(response.user);
  };
  const logout = () => {
    void authService.logout();
    setUser(null);
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isAuthenticated: !!user && authService.isAuthenticated(),
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
// 4. هوك useAuth للاستخدام في المكونات
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
