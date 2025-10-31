// frontend/src/services/RoomService.js
import axios from '../api/axios'; // configured axios (with baseURL + auth header)
import { toast } from 'react-toastify';

const BASE = '/rooms'; // maps to /api/rooms

/**
 * Normalize a room object — consistent field names and active tenant
 */
const normalizeRoom = (r) => {
  if (!r) return r;

  // Active tenant (no moveOutDate)
  const activeTenant = r.tenants?.find((t) => !t.moveOutDate) || null;

  return {
    _id: r._id,
    building: r.building || '', // building object or name
    number: r.number,
    roomNumber: r.roomNumber,
    rent: r.rent ?? (activeTenant?.rentAmount ? Number(activeTenant.rentAmount) : 0),
    tenants: r.tenants || [],
    tenantHistory: r.tenantHistory || [],
    isBooked: r.isBooked ?? false,
    tenant: activeTenant,
    updatedAt: r.updatedAt,
  };
};

/**
 * Fetch rooms for a specific building
 */
export const getRoomsByBuilding = async (buildingId) => {
  if (!buildingId) throw new Error("Building ID is required");
  const res = await axios.get(`${BASE}/building/${buildingId}`);
  const data = Array.isArray(res.data) ? res.data.map(normalizeRoom) : normalizeRoom(res.data);
  return { ...res, data };
};

/**
 * Create a new room
 */
export const createRoom = async ({ number, buildingId }) => {
  if (!number || !buildingId)
    throw new Error("Room number and buildingId are required");
  const res = await axios.post(BASE, { number, buildingId });
  return { ...res, data: normalizeRoom(res.data) };
};

/**
 * Update an existing room
 */
export const updateRoom = async (roomId, { number }) => {
  if (!roomId || !number) throw new Error("Room ID and number are required");
  const res = await axios.put(`${BASE}/${roomId}`, { number });
  return { ...res, data: normalizeRoom(res.data) };
};

/**
 * Get a single room by ID
 */
export const getRoom = async (id) => {
  if (!id) throw new Error('getRoom: id required');
  const res = await axios.get(`${BASE}/${id}`);
  return { ...res, data: normalizeRoom(res.data) };
};

/**
 * Manager-specific: Get rooms for logged-in manager
 */
export const getRoomsForManager = async () => {
  try {
    const res = await axios.get("/manager/rooms");
    const data = Array.isArray(res.data) ? res.data.map(normalizeRoom) : normalizeRoom(res.data);
    return { ...res, data };
  } catch (err) {
    console.error("getRoomsForManager:", err);
    toast.error(err?.response?.data?.message || "Failed to fetch rooms");
    throw err;
  }
};

/**
 * Get tenant history for a room (manager view)
 */
export const getTenantHistoryByRoom = async (roomId) => {
  try {
    const res = await axios.get(`/manager/rooms/${roomId}/tenants`);
    return res;
  } catch (err) {
    console.error("getTenantHistoryByRoom:", err);
    toast.error(err?.response?.data?.message || "Failed to fetch tenant history");
    throw err;
  }
};

/**
 * Get all rooms (no building filter) — uses BASE
 */
export const getAllRooms = async () => {
  try {
    const res = await axios.get(BASE);
    const data = Array.isArray(res.data) ? res.data.map(normalizeRoom) : normalizeRoom(res.data);
    return { ...res, data };
  } catch (err) {
    console.error("getAllRooms:", err);
    toast.error(err?.response?.data?.message || "Failed to fetch rooms");
    throw err;
  }
};

export default {
  getRoomsByBuilding,
  createRoom,
  updateRoom,
  getRoom,
  getRoomsForManager,
  getTenantHistoryByRoom,
  getAllRooms,
};
