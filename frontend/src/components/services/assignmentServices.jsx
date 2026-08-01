import api from '../../api/api.js';

/**
 * API helpers for assignments
 * - These wrappers call the server endpoints you already implemented:
 *   GET  /assignments/available
 *   GET  /assignments/available-for-me
 *   GET  /assignments/for-me
 *   PATCH /assignments/:id/pick
 *   PATCH /assignments/:id/release
 *   POST /assignments/:id/complete
 */

export const fetchAvailableAssignments = async (config = {}) => {
  const res = await api.get('/assignments/available', config);
  return res.data;
};

export const fetchAvailableForMe = async (params = {}, config = {}) => {
  const res = await api.get('/assignments/available-for-me', { ...config, params });
  return res.data;
};

export const fetchAssignedForMe = async (params = {}, config = {}) => {
  const res = await api.get('/assignments/for-me', { ...config, params });
  return res.data; // array of assignments or { assignments: [...] } depending on backend shape
};

export const claimAssignment = async (assignmentId) => {
  const res = await api.patch(`/assignments/${assignmentId}/pick`, {});
  return res.data;
};

export const releaseAssignment = async (assignmentId) => {
  const res = await api.patch(`/assignments/${assignmentId}/release`, {});
  return res.data;
};

// Complete an assignment (backend will validate owner). opts can include { nextStageWorkers }
export const completeAssignment = async (assignmentId, opts = {}) => {
  const res = await api.patch(`/assignments/${assignmentId}/complete`, opts);
  return res.data;
};

export const getAssignment = async (id) => {
  const res = await api.get(`/assignments/${id}`);
  return res.data;
};
