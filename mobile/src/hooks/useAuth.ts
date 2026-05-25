import {useAuthStore} from '../stores/authStore';
import {authApi} from '../api/auth';

export function useAuth() {
  const {
    user,
    accessToken,
    isLoading,
    setAuth,
    logout: storeLogout,
    setLoading,
    updateUser,
  } = useAuthStore();

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const {data} = await authApi.login(email, password);
      setAuth(data.user, data.access_token, data.refresh_token);
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    username: string,
    email: string,
    password: string,
    inviteCode: string = '',
  ) => {
    setLoading(true);
    try {
      const {data} = await authApi.register(username, email, password, inviteCode);
      setAuth(data.user, data.access_token, data.refresh_token);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {}
    storeLogout();
  };

  return {
    user,
    accessToken,
    isLoading,
    isAuthenticated: !!accessToken,
    login,
    register,
    logout,
    updateUser,
  };
}
