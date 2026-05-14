import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authApi from '../lib/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // При загрузке приложения проверяем токен на сервере
  useEffect(() => {
    const initAuth = async () => {
      try {
        const fetchedUser = await authApi.getMe();
        setUser(fetchedUser);
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await authApi.login(email, password);
    if (!result.error) {
      setUser(result.user);
    }
    return result;
  }, []);

  const register = useCallback(async (email, password, fullName, role, groupName) => {
    const result = await authApi.register(email, password, fullName, role, groupName);
    if (!result.error) {
      setUser(result.user);
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
