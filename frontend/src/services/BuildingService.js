// BuildingService.js
import api from "../api/axios";

const API_URL = "/buildings";

// ✅ Get all buildings
export const getBuildings = () => api.get(API_URL);

// ✅ Alias (optional)
export const getAllBuildings = () => api.get(API_URL);

// ✅ Create a building
export const createBuilding = (data) => api.post(API_URL, data);

// ✅ Update a building
export const updateBuilding = (id, data) =>
  api.put(`${API_URL}/${id}`, data);
