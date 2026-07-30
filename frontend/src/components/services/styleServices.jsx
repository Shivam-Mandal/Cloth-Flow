// src/services/styleServices.js
import api from "../../api/api";

// ✅ Fetch all styles (returns array of styles directly, used by StyleManagement.jsx)
export const fetchStyles = async () => {
  const res = await api.get("/styles/");
  return res.data.data; 
};

// For StyleContext compatibility (returns wrapper object { success, data })
export const getAllStyles = async () => {
  const res = await api.get("/styles/");
  return res.data;
};

// ✅ Create a new style (used by StyleManagement.jsx)
export const createStyle = async (stylePayload) => {
  const res = await api.post("/styles", stylePayload);
  return res.data.data;
};

// For StyleContext compatibility (stub since backend lacks PUT /styles/:id)
export const updateStyle = async () => {
  console.warn("updateStyle is not supported by the backend");
  return { success: false, message: "Update style not supported by backend" };
};

// For StyleContext compatibility (stub since backend lacks PATCH /styles/:id/steps)
export const patchSteps = async () => {
  console.warn("patchSteps is not supported by the backend");
  return { success: false, message: "Patch steps not supported by backend" };
};

// ✅ Delete a style (used by StyleManagement.jsx and StyleContext.jsx)
export const deleteStyle = async (id) => {
  const res = await api.delete(`/styles/${id}`);
  return res.data;
};

export const fetchStages = async () => {
  const res = await api.get('/stages');
  return res.data.data;
};

export const createStage = async (payload) => {
  const res = await api.post('/stages', payload);
  return res.data.data;
};

export const updateStage = async (id, payload) => {
  const res = await api.patch(`/stages/${id}`, payload);
  return res.data.data;
};

export const deleteStage = async (id) => {
  const res = await api.delete(`/stages/${id}`);
  return res.data;
};
