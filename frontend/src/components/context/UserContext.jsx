// src/context/UserContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../../api/api"; // axios instance with withCredentials: true
import * as authService from "../services/authServices";
import * as orderService from "../services/orderServices"; // we'll create this file below
import axios from "axios";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  // ==== USER STATE ====
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // ==== ORDER STATE ====
  const [orders, setOrders] = useState([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState(null);

  // ================== USER FUNCTIONS ==================
  const fetchMe = async () => {
    setLoading(true);
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.user ?? null);
      return { success: true, user: res.data.user ?? null };
    } catch (err) {
      setUser(null);
      return {
        success: false,
        message: err?.response?.data?.message || "Not authenticated",
      };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchMe();
      setInitialLoadDone(true);
    };
    init();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const result = await authService.login(email, password);
      if (result.success) {
        await fetchMe();
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (formData) => {
    setLoading(true);
    try {
      const result = await authService.signup(formData);
      if (result.success) {
        await fetchMe();
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const result = await authService.logout();
      if (result.success) {
        setUser(null);
        setOrders([]); // clear orders on logout
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  // ================== ORDER FUNCTIONS ==================
  const fetchOrders = async () => {
    if (!user) return { success: false, message: "User not logged in" };
    setOrderLoading(true);
    try {
      const res = await orderService.getOrders();
      setOrders(res.data.orders || []);
      return { success: true, orders: res.data.orders || [] };
    } catch (err) {
      setOrderError(err?.response?.data?.message || "Failed to fetch orders");
      return { success: false, message: setOrderError };
    } finally {
      setOrderLoading(false);
    }
  };

  const createOrder = async (orderData) => {
    setOrderLoading(true);
    try {
      const res = await orderService.createOrder(orderData);
      // add new order to existing list
      setOrders((prev) => [...prev, res.data.order]);
      return { success: true, order: res.data.order };
    } catch (err) {
      setOrderError(err?.response?.data?.message || "Order creation failed");
      return { success: false, message: orderError };
    } finally {
      setOrderLoading(false);
    }
  };

  const deleteOrder = async (orderId) => {
    setOrderLoading(true);
    try {
      await orderService.deleteOrder(orderId);
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
      return { success: true };
    } catch (err) {
      setOrderError(err?.response?.data?.message || "Delete failed");
      return { success: false, message: orderError };
    } finally {
      setOrderLoading(false);
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        loading,
        login,
        signup,
        logout,
        fetchMe,
        initialLoadDone,
        // order-related
        orders,
        setOrders,
        fetchOrders,
        createOrder,
        deleteOrder,
        orderLoading,
        orderError,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
