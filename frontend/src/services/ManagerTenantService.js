// frontend/src/services/ManagerTenantService.js
// Manager-scoped tenant APIs (used by manager UI)
// Uses the shared axios instance at src/api/axios

import axios from "../api/axios";

/**
 * Create a tenant (manager)
 * POST /api/manager/tenants
 * data must include: fullName, room (room id), numberOfPersons (etc.)
 */
export const createTenant = async (data) => {
  if (!data || !data.fullName) throw new Error("createTenant: fullName required");
  if (!data.room) throw new Error("createTenant: room id required");
  return axios.post("/manager/tenants", data);
};

/**
 * Update tenant (manager)
 * PUT /api/manager/tenants/:id
 */
export const updateTenant = async (id, data) => {
  if (!id) throw new Error("updateTenant: id required");
  if (!data) throw new Error("updateTenant: payload required");
  return axios.put(`/manager/tenants/${id}`, data);
};

/**
 * Delete tenant (manager)
 * DELETE /api/manager/tenants/:id
 */

/**
 * Mark tenant leave (manager)
 * POST /api/manager/tenants/leave/:id
 */
export const markLeaveTenant = async (id, leaveDate) => {
  if (!id) throw new Error("markLeaveTenant: id required");
  if (!leaveDate) throw new Error("markLeaveTenant: leaveDate required");
  return axios.post(`/manager/tenants/leave/${id}`, { leaveDate });
};

/**
 * New: Get tenants by building ids (manager)
 * GET /api/manager/tenants/by-buildings?buildings=id1,id2
 * Pass an array of building ids (or a single id in array)
 */
export const getTenantsByBuildings = async (buildingIds) => {
  if (!Array.isArray(buildingIds) || buildingIds.length === 0) {
    throw new Error("getTenantsByBuildings: buildingIds (non-empty array) required");
  }
  const q = buildingIds.join(",");
  return axios.get(`/manager/tenants/by-buildings?buildings=${encodeURIComponent(q)}`);
};

/**
 * Optional: Get tenants for a specific room (manager)
 * GET /api/manager/tenants/:roomId
 */
export const getTenantsByRoom = async (roomId) => {
  if (!roomId) throw new Error("getTenantsByRoom: roomId required");
  return axios.get(`/manager/rooms/${roomId}/tenants`);
};

export default {
  createTenant,
  updateTenant,
  markLeaveTenant,
  getTenantsByBuildings,
  getTenantsByRoom,
};
