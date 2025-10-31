// frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import axios, { setAuthToken } from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // ✅ Safe getter for localStorage (won’t throw SecurityError)
  const safeGet = (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
    } catch (err) {
      console.warn(`localStorage get error for key "${key}":`, err);
    }
    return null;
  };

  const safeSet = (key, value) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } catch (err) {
      console.warn(`localStorage set error for key "${key}":`, err);
    }
  };

  const safeRemove = (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch (err) {
      console.warn(`localStorage remove error for key "${key}":`, err);
    }
  };

  // ✅ Initialize state safely
  const [user, setUser] = useState(() => {
    const raw = safeGet('user');
    return raw ? JSON.parse(raw) : null;
  });

  const [token, setToken] = useState(() => safeGet('token'));
  const [loading, setLoading] = useState(false);

  // ✅ Sync token with axios helper on mount
  useEffect(() => {
    if (token) {
      setAuthToken(token);
    } else {
      setAuthToken(null);
    }
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await axios.post('/auth/login', { email, password });
      const { token: tkn, user: usr } = res.data;
      if (!tkn || !usr) throw new Error('Invalid login response');

      setToken(tkn);
      setUser(usr);
      safeSet('token', tkn);
      safeSet('user', JSON.stringify(usr));

      setAuthToken(tkn);
      return res.data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    safeRemove('token');
    safeRemove('user');
    setAuthToken(null);
  };

  const isAuthenticated = () => !!token;

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isAuthenticated, loading, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};