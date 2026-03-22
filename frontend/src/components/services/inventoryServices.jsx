import api from '../../api/api';

export const fetchInventory = async (params = {}) => {
  const res = await api.get('/approvals/inventory', { params });
  return res.data;
};

export const updateInventory = async (subOrderId, payload) => {
  const res = await api.patch(`/suborders/${subOrderId}/inventory`, payload);
  return res.data;
};
