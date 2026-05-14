import { api } from './api';

export const register = async (email, password, fullName, role, groupName) => {
  try {
    const data = await api.post('/auth/register', { email, password, fullName, role, groupName });
    if (!data || data.error) return { error: data?.error || 'Тіркелу қатесі' };
    
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    
    return { user: data.user, token: data.accessToken };
  } catch (err) {
    return { error: err.message || 'Сервермен байланыс жоқ' };
  }
};

export const login = async (email, password) => {
  try {
    const data = await api.post('/auth/login', { email, password });
    if (!data || data.error) return { error: data?.error || 'Жүйеге кіру қатесі' };
    
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    
    return { user: data.user, token: data.accessToken };
  } catch (err) {
    return { error: err.message || 'Сервермен байланыс жоқ' };
  }
};

export const logout = async () => {
  try {
    await api.post('/auth/logout', { refreshToken: localStorage.getItem('refreshToken') });
  } catch(e) {}
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('auth_user');
};

export const getCurrentUser = () => {
  const userStr = localStorage.getItem('auth_user');
  return userStr ? JSON.parse(userStr) : null;
};

export const getMe = async () => {
  if (!localStorage.getItem('accessToken')) return null;
  try {
    const data = await api.get('/auth/me');
    if (data && data.user) {
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      return data.user;
    }
    return null;
  } catch {
    logout();
    return null;
  }
};
