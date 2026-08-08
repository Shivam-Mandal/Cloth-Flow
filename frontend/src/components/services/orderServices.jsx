// src/services/orderServices.jsx
import api from "../../api/api";

/**
 * Orders service - returns res.data for convenience
 */

export const getOrders = () => api.get("/orders/").then((res) => res.data);

export const createOrder = (orderData) => api.post("/orders/", orderData).then((res) => res.data);

export const deleteOrder = (orderId) =>
  api.delete(`/orders/${orderId}`).then((res) => res.data);

export const updateOrder = (orderId, data) =>
  api.put(`/orders/${orderId}`, data).then((res) => res.data);
