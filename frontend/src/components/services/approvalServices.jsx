import api from '../../api/api';

/**
 * API helpers for approvals
 */

// Admin functions
export const fetchPendingApprovals = async () => {
  const res = await api.get('/approvals/pending');
  return res.data;
};

export const approveSubOrder = async (subOrderId) => {
  const res = await api.post(`/approvals/${subOrderId}/approve`);
  return res.data;
};

export const rejectSubOrder = async (subOrderId, reason = '') => {
  const res = await api.post(`/approvals/${subOrderId}/reject`, { reason });
  return res.data;
};

export const fetchBulkApprovalSummary = async (subOrderIds) => {
  const res = await api.post('/approvals/summary', { subOrderIds });
  return res.data;
};

export const bulkApproveSubOrders = async (subOrderIds) => {
  const res = await api.post('/approvals/bulk-approve', { subOrderIds });
  return res.data;
};

export const bulkRejectSubOrders = async (subOrderIds, reason = '') => {
  const res = await api.post('/approvals/bulk-reject', { subOrderIds, reason });
  return res.data;
};

export const fetchApprovalHistory = async (params = {}) => {
  const res = await api.get('/approvals/history', { params });
  return res.data;
};

export const fetchPackingInventory = async (params = {}) => {
  const res = await api.get('/approvals/inventory', { params });
  return res.data;
};

// Worker functions
export const fetchWorkerPendingApprovals = async () => {
  const res = await api.get('/approvals/worker/pending');
  return res.data;
};

export const fetchWorkerCompletedWork = async () => {
  const res = await api.get('/approvals/worker/completed-work');
  return res.data;
};

export const fetchWorkerApprovalHistory = async (params = {}) => {
  const res = await api.get('/approvals/worker/history', { params });
  return res.data;
};
