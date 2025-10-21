// api.js
import axios from 'axios';

const api = axios.create({
  // baseURL: 'https://clothflow-backend.onrender.com/api',
  // baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  baseURL: 'https://cloth-flow-production.onrender.com/api',
  withCredentials: true, 
  headers: {
    'Content-Type': 'application/json',
  },
});


export default api;

