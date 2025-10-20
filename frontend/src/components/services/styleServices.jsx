// src/services/styleServices.js
import api from "../../api/api";

// ✅ Fetch all styles
export const fetchStyles = async () => {
  const res = await api.get("/styles");
  return res.data.data; // adjust based on your backend response
};

// ✅ Create a new style
export const createStyle = async (stylePayload) => {
  const res = await api.post("/styles", stylePayload);
  return res.data.data;
};

// ✅ Delete a style
export const deleteStyle = async (id) => {
  const res = await api.delete(`/styles/${id}`);
  return res.data;
};
