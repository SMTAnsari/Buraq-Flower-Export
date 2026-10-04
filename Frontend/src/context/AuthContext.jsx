import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

const normaliseUser = (u) => u ? { ...u, _id: u._id || u.id } : null;

// Decode JWT payload without verifying signature (client-side fallback only)
const decodeToken = (token) => {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Check token expiry before making a network call
      const decoded = decodeToken(token);
      if (decoded && decoded.exp * 1000 < Date.now()) {
        // Token is expired — remove it
        localStorage.removeItem('token');
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/profile');
        setUser(normaliseUser(res.data));
      } catch (err) {
        if (err.response?.status === 401) {
          // Server explicitly rejected the token — remove it
          localStorage.removeItem('token');
          setUser(null);
        } else {
          // Network error, 404, 500, etc. — keep token, restore user from payload
          if (decoded) {
            setUser(normaliseUser({ id: decoded.id, _id: decoded.id, role: decoded.role }));
          }
          // If decode also failed, leave user as null but keep token for retry
        }
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(normaliseUser(res.data.user));
    return res.data;
  };

  const register = async (name, email, password, role = 'user', businessName = '', businessAddress = '') => {
    const payload = { name, email, password, role };
    if (role === 'seller') {
      payload.businessName = businessName;
      payload.businessAddress = businessAddress;
    }
    const res = await api.post('/auth/register', payload);
    if (role === 'seller') return res.data;
    localStorage.setItem('token', res.data.token);
    setUser(normaliseUser(res.data.user));
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const googleLogin = async () => {
    throw new Error('Google login is not supported by this backend.');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
