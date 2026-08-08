// src/services/workerService.jsx
import api from '../../api/api'

// Get all workers or a specific worker when an id is provided
export const getWorker = async (id = null, config = {}) => {
  try {
    const url = id ? `/workers/${id}` : '/workers';
    const response = await api.get(url, config);
    return response.data;
  } catch (error) {
    console.error("Error fetching workers:", error);
    throw error.response?.data || { message: "Failed to fetch workers" };
  }
};

// Get a specific worker by ID
export const getWorkerById = async (id, config = {}) => {
  try {
    const response = await api.get(`/workers/${id}`, config);
    return response.data;
  } catch (error) {
    console.error("Error fetching worker by id:", error);
    throw error.response?.data || { message: "Failed to fetch worker" };
  }
};

// Get active workers count
export const getActiveWorkersCount = async () => {
  try {
    const response = await api.get('/workers/active/count');
    return response.data;
  } catch (error) {
    console.error("Error fetching active workers count:", error);
    throw error.response?.data || { message: "Failed to fetch active workers count" };
  }
};
