// BuildingService.js
import axios from "axios";

// Dynamically switch between local & production
const API_URL ="https://rental-management-v2.onrender.com/api";
    
const API_URL = `${API_BASE_URL}/buildings`;

export const getBuildings = () => {
  return axios.get(API_URL);
};

export const getAllBuildings = () => {
  return axios.get(API_URL);
};
/**
 * Create a building
 * @param {{ name: string, address: string }} data
 */
export const createBuilding = (data) => {
  return axios.post(API_URL, data);
};

/**
 * Update a building
 * @param {string} id
 * @param {{ name?: string, address?: string }} data
 */
export const updateBuilding = (id, data) => {
  return axios.put(`${API_URL}/${id}`, data);
};
