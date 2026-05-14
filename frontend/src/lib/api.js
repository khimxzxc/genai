// src/lib/api.js

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function request(path, options = {}) {
  const accessToken = localStorage.getItem('accessToken');

  const headers = { ...options.headers };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  // If body is FormData, don't set Content-Type to allow browser to set boundary
  // Only set application/json if there is a body and it's not FormData
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && !path.startsWith('/auth/')) {
    try {
      const data = await res.json();
      if (data.code === 'TOKEN_EXPIRED') {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          // Retry the request with the new token
          const newHeaders = { ...headers };
          newHeaders.Authorization = `Bearer ${localStorage.getItem('accessToken')}`;
          const retryRes = await fetch(`${API}${path}`, {
            ...options,
            headers: newHeaders,
          });
          return retryRes.json();
        }
      }
    } catch (e) {
      // Ignored if not JSON
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('auth_user');
    window.location.href = '/login';
    return { error: 'Авторизация қатесі' };
  }

  const responseData = await res.json();
  return responseData;
}

export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  const res = await fetch(`${API}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) return false;

  const { accessToken, refreshToken: newRefresh } = await res.json();
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', newRefresh);
  return true;
}

export const api = {
  get:  (path)         => request(path, { method: 'GET' }),
  post: (path, body)   => request(path, { method: 'POST',  body: body instanceof FormData ? body : JSON.stringify(body) }),
  put:  (path, body)   => request(path, { method: 'PUT',   body: body instanceof FormData ? body : JSON.stringify(body) }),
  del:  (path)         => request(path, { method: 'DELETE' }),
};

export const uploadFiles = async (files, title, assignmentId = null, classroomId = null) => {
  const formData = new FormData();
  formData.append('title', title);
  if (assignmentId) {
    formData.append('assignmentId', assignmentId);
  }
  if (classroomId) {
    formData.append('classroomId', classroomId);
  }
  
  files.forEach(file => {
    formData.append('files', file);
    formData.append('paths', file.customPath || file.name);
  });

  return api.post('/upload', formData);
};

export const evaluateSubmission = async (submissionId) => {
  return api.post(`/evaluate/${submissionId}`);
};
