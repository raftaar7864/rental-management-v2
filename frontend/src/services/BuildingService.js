// BuildingService.js
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL + "/buildings"; // ✅ Works on Vercel + Local

const authHeader = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  return user?.token ? { Authorization: `Bearer ${user.token}` } : {};
};

// ✅ Get buildings
export const getBuildings = () => {
  return axios.get(API_URL, { headers: authHeader() });
};

export const getAllBuildings = () => {
  return axios.get(API_URL, { headers: authHeader() });
};

// ✅ Create building
export const createBuilding = (data) => {
  return axios.post(API_URL, data, { headers: authHeader() });
};

// ✅ Update building
export const updateBuilding = (id, data) => {
  return axios.put(`${API_URL}/${id}`, data, { headers: authHeader() });
};
