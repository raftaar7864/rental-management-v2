// BuildingService.js
import axios from "axios";

const API_URL = "http://localhost:5000/api/buildings";

/**
 * Get all buildings
 * returns axios promise
 */
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
