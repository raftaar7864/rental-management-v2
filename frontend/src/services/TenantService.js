// frontend/src/services/TenantService.js
import axios from '../api/axios';

const ADMIN_BASE = '/tenants';             // maps to /api/tenants
const MANAGER_BASE = '/manager/tenants';   // maps to /api/manager/tenants

// ----------------- Admin / general tenant services -----------------
export const getAllTenants = () => axios.get(ADMIN_BASE);

export const getTenant = (id) => {
  if (!id) throw new Error('getTenant: id required');
  return axios.get(`${ADMIN_BASE}/${id}`);
};

export const createTenant = (data) => {
  const { fullName, room, numberOfPersons } = data || {};
  if (!fullName) throw new Error('createTenant: fullName is required');
  if (!room) throw new Error('createTenant: room is required');
  if (numberOfPersons === undefined || numberOfPersons === null) throw new Error('createTenant: numberOfPersons is required');
  return axios.post(ADMIN_BASE, data);
};

export const updateTenant = (tenantId, data) => {
  if (!tenantId) throw new Error('updateTenant: tenantId required');
  if (!data) throw new Error('updateTenant: update payload required');

  // Defensive: do not allow room/building changes through this endpoint
  const payload = { ...data };
  ['room', 'building', '_id', '__v', 'tenantId', 'createdAt', 'updatedAt'].forEach(f => {
    if (payload.hasOwnProperty(f)) delete payload[f];
  });

  return axios.put(`${ADMIN_BASE}/${tenantId}`, payload)
    .catch(err => {
      if (err.response) console.error('PUT /tenants/:id failed', err.response.status, err.response.data);
      else console.error('PUT /tenants/:id failed (no response)', err);
      throw err;
    });
};

export const deleteTenant = (tenantId) => {
  if (!tenantId) throw new Error('deleteTenant: tenantId required');
  return axios.delete(`${ADMIN_BASE}/${tenantId}`);
};

export const markLeaveTenant = (tenantId, moveOutDate) => {
  if (!tenantId) throw new Error('markLeaveTenant: tenantId required');
  if (!moveOutDate) throw new Error('markLeaveTenant: moveOutDate required');
  return axios.put(`${ADMIN_BASE}/${tenantId}/mark-leave`, { moveOutDate });
};

// ----------------- Manager-specific services -----------------
export const getTenantsByRoom = (roomId) => {
  if (!roomId) throw new Error('getTenantsByRoom: roomId required');
  return axios.get(`${MANAGER_BASE}/${roomId}`);
};

export const createTenantAsManager = (data) => {
  const { fullName, room, numberOfPersons } = data || {};
  if (!fullName) throw new Error('createTenantAsManager: fullName is required');
  if (!room) throw new Error('createTenantAsManager: room is required');
  if (numberOfPersons === undefined || numberOfPersons === null) throw new Error('createTenantAsManager: numberOfPersons is required');
  return axios.post(MANAGER_BASE, data);
};

export const updateTenantAsManager = (id, data) => {
  if (!id) throw new Error('updateTenantAsManager: id required');
  if (!data) throw new Error('updateTenantAsManager: payload required');
  return axios.put(`${MANAGER_BASE}/${id}`, data);
};

export const deleteTenantAsManager = (id) => {
  if (!id) throw new Error('deleteTenantAsManager: id required');
  return axios.delete(`${MANAGER_BASE}/${id}`);
};

export const markLeaveTenantAsManager = (id, leaveDate) => {
  if (!id) throw new Error('markLeaveTenantAsManager: id required');
  if (!leaveDate) throw new Error('markLeaveTenantAsManager: leaveDate required');
  return axios.post(`${MANAGER_BASE}/leave/${id}`, { leaveDate });
};

/**
 * New: Get all tenants by assigned building(s) for manager
 * @param {string[]} buildingIds - array of building _id assigned to manager
 */
export const getAllTenantsByBuildingsAsManager = (buildingIds) => {
  if (!buildingIds || !Array.isArray(buildingIds) || buildingIds.length === 0) {
    throw new Error('getAllTenantsByBuildingsAsManager: buildingIds required');
  }
  const query = buildingIds.join(',');
  return axios.get(`${MANAGER_BASE}/by-buildings?buildings=${query}`);
};

// ----------------- Default export -----------------
export default {
  getAllTenants,
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,
  markLeaveTenant,
  // manager variants
  getTenantsByRoom,
  createTenantAsManager,
  updateTenantAsManager,
  deleteTenantAsManager,
  markLeaveTenantAsManager,
  getAllTenantsByBuildingsAsManager
};
