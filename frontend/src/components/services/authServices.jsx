// src/services/authService.js";

import api from '../../api/api';

/**
 * NOTE:
 * - api must be created with `withCredentials: true`
 * - backend routes used here:
 *   POST /auth/login    -> sets cookies (httpOnly)
 *   POST /auth/register -> create user (optional auto-login)
 *   POST /auth/logout   -> clears cookies
 *   GET  /auth/me       -> returns { user }
 */

export const login = async (email, password) => {
  try {
    // 1) call login endpoint; server should set httpOnly cookies (access/refresh)
    const res = await api.post("/auth/login", { email, password });

    // 2) wait a moment for cookies to be set, then request /auth/me
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const me = await api.get("/auth/me");
      return { success: true, message: res.data?.message || "Logged in", user: me.data.user ?? null };
    } catch (meErr) {
      console.error('Failed to fetch user profile:', meErr.response?.data || meErr.message);
      // Try refresh token if available
      try {
        await api.post("/auth/refresh-token");
        const me = await api.get("/auth/me");
        return { success: true, message: res.data?.message || "Logged in", user: me.data.user ?? null };
      } catch (refreshErr) {
        return {
          success: false,
          message: "Logged in but failed to fetch user profile",
        };
      }
    }
  } catch (err) {
    const message = err?.response?.data?.message || err?.response?.data?.error || "Login failed";
    return { success: false, message };
  }
};

export const signup = async (formData) => {
  try {
    // Align endpoint name with backend: /auth/register
    const res = await api.post("/auth/signup", formData);
    // Optionally, backend might auto-login and set cookies — caller will call fetchMe
    return { success: true, message: res.data?.message || "Registered" };
  } catch (err) {
    const message = err?.response?.data?.message || err?.response?.data?.error || "Signup failed";
    return { success: false, message };
  }
};

export const logout = async () => {
  try {
    const res = await api.post("/auth/logout");
    return { success: true, message: res.data?.message || "Logged out" };
  } catch (err) {
    const message = err?.response?.data?.message || err?.response?.data?.error || "Logout failed";
    return { success: false, message };
  }
};
