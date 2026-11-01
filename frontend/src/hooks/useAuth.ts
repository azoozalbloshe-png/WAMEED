import { useAuth } from '../contexts/AuthContext';

export function useAuthUser() {
  const { user, isLoading } = useAuth();
  return { user, isLoading };
}

export function useAuthUserRequired() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return { user: null, isLoading: true, isAuthenticated: false };
  }

  if (!isAuthenticated) {
    return { user: null, isLoading: false, isAuthenticated: false };
  }

  return { user, isLoading: false, isAuthenticated: true };
}
