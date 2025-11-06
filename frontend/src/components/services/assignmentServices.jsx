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
 *   PATCH /assignments/:id       (optional generic update)
 *
 * Note: The server typically uses req.user to identify the worker. Passing `workerId`
 * in the body is optional and useful for local/dev calls where auth isn't attached.
 */

export const fetchAvailableAssignments = async () => {
  const res = await api.get('/assignments/available');
  return res.data;
};

export const fetchAvailableForMe = async (params = {}) => {
  const res = await api.get('/assignments/available-for-me', { params });
  return res.data;
};

export const fetchAssignedForMe = async (params = {}) => {
  const res = await api.get('/assignments/for-me', { params });
  return res.data; // array of assignments or { assignments: [...] } depending on backend shape
};

// Claim / pick an assignment. workerId is optional — backend prefers req.user
export const claimAssignment = async (assignmentId, workerId = undefined) => {
  const body = {};
  if (workerId) body.workerId = workerId;
  const res = await api.patch(`/assignments/${assignmentId}/pick`, body);
  return res.data;
};

// Release / deselect an assignment. backend checks req.user; workerId optional
export const releaseAssignment = async (assignmentId, workerId = undefined) => {
  const body = {};
  if (workerId) body.workerId = workerId;
  const res = await api.patch(`/assignments/${assignmentId}/release`, body);
  return res.data;
};

// Complete an assignment (backend will validate owner). opts can include { nextStageWorkers }
export const completeAssignment = async (assignmentId, opts = {}) => {
  const res = await api.patch(`/assignments/${assignmentId}/complete`, opts);
  return res.data;
};

// Generic patch for assignments (useful for updating status or progress)
export const patchAssignment = async (assignmentId, patch = {}) => {
  const res = await api.patch(`/assignments/${assignmentId}`, patch);
  return res.data;
};

export const getAssignment = async (id) => {
  const res = await api.get(`/assignments/${id}`);
  return res.data;
};
