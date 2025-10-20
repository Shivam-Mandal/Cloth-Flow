// src/services/stockService.jsx
import api from '../../api/api'; // your axios instance

const stockService = {
  fetchStocks: async () => {
    const res = await api.get('/stocks/'); // GET all stocks
    return res.data?.data ?? []; // adjust if your API returns differently
  },

  createStock: async (stock) => {
    const res = await api.post('/stocks/', stock);
    console.log(res.data.data) // POST new stock
    return res.data?.data ?? null;
  },

  deleteStock: async (id) => {
    const res = await api.delete(`/stocks/${id}`); // DELETE stock by id
    return res.data;
  },

  updateStock: async (id, stock) => {
    const res = await api.put(`/stocks/${id}`, stock); // PUT updated stock
    return res.data?.data ?? null;
  },
};

export default stockService;
