// frontend/src/services/ManagerRoomService.js
import axios from './axios'; // your configured axios instance with baseURL and auth
const BASE = '/rooms';

export const getManagerRooms = async () => {
  return await axios.get('/manager/rooms');
};

export const getTenantsByRoom = async (roomId) => {
  return await axios.get(`/manager/tenants/${roomId}`);
};

export const getRoomsByBuilding = async (buildingId) => {
  if (!buildingId) throw new Error("Building ID is required");
  return axios.get(`${BASE}/building/${buildingId}`);
};