// src/services/orderServices.jsx
import api from "../../api/api";

/**
 * Fetch all styles
 */
export const fetchStyles = async () => {
  const res = await api.get("/styles/"); // match your backend endpoint
  return res.data?.data || res.data || [];
};



// Fetch all orders (for logged-in user or admin)
export const getOrders = () => api.get("/orders");

// Create a new order
export const createOrder = (orderData) => api.post("/orders", orderData);

// Delete order by id
export const deleteOrder = (orderId) => api.delete(`/orders/${orderId}`);

// Optional: update order
export const updateOrder = (orderId, data) => api.put(`/orders/${orderId}`, data);



