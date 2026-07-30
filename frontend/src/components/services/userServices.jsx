import api from '../../api/api';

export const fetchUsers = async () => {
  const res = await api.get('/users');
  return res.data;
};

export const createUser = async (payload) => {
  const res = await api.post('/users', payload);
  return res.data;
};

export const updateUser = async (id, payload) => {
  const res = await api.patch(`/users/${id}`, payload);
  return res.data;
};
