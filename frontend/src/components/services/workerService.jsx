// src/services/workerService.jsx
import api from '../../api/api'

// Get all workers
export const getWorker = async () => {
  try {
    const response = await api.get('/workers');
    return response.data;
  } catch (error) {
    console.error("Error fetching workers:", error);
    throw error.response?.data || { message: "Failed to fetch workers" };
  }
};

// Get a specific worker by ID
export const getWorkerById = async (id) => {
  try {
    const response = await api.get(`/workers/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching worker by ID:", error);
    throw error.response?.data || { message: "Failed to fetch worker" };
  }
};
