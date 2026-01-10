// src/services/authService.js";

import api from '../../api/api';

export const login = async (email, password) => {
  try {
    const res = await api.post("/auth/login", { email, password });
    
    // Store tokens if provided
    if (res.data.accessToken) {
      localStorage.setItem('accessToken', res.data.accessToken);
    }
    if (res.data.refreshToken) {
      localStorage.setItem('refreshToken', res.data.refreshToken);
    }
    
    // Fetch user profile
    try {
      const me = await api.get("/auth/me");
      return { success: true, message: res.data?.message || "Logged in", user: me.data.user ?? null };
    } catch (meErr) {
      console.error('Failed to fetch user profile:', meErr.response?.data || meErr.message);
      return {
        success: false,
        message: "Logged in but failed to fetch user profile",
      };
    }
  } catch (err) {
    const message = err?.response?.data?.message || err?.response?.data?.error || "Login failed";
    return { success: false, message };
  }
};

export const signup = async (formData) => {
  try {
    const res = await api.post("/auth/signup", formData);
    return { success: true, message: res.data?.message || "Registered" };
  } catch (err) {
    const message = err?.response?.data?.message || err?.response?.data?.error || "Signup failed";
    return { success: false, message };
  }
};

export const logout = async () => {
  try {
    const res = await api.post("/auth/logout");
    // Clear stored tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return { success: true, message: res.data?.message || "Logged out" };
  } catch (err) {
    // Clear tokens even if logout request fails
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    const message = err?.response?.data?.message || err?.response?.data?.error || "Logout failed";
    return { success: false, message };
  }
};

export const getCurrentUser = async () => {
  try {
    const res = await api.get("/auth/me");
    return { success: true, user: res.data.user };
  } catch (err) {
    return { success: false, message: "Failed to get current user" };
  }
};