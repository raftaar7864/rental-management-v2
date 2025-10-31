// frontend/src/components/TenantFormModal.jsx
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Modal from './Modal';

/**
 * TenantFormModal
 * Reusable Add / Edit tenant form inside a Modal with inline validation errors.
 *
 * Behavior:
 * - If tenant is active (no moveOutDate) => moveOutDate input is disabled (can't set/update),
 *   moveInDate can be updated.
 * - If tenant is not active (has moveOutDate) => moveInDate input is disabled, moveOutDate can be updated.
 *
 * The component exposes a helper inside to update only moveOutDate (handleUpdateMoveOutDate).
 */
export default function TenantFormModal({
  isOpen,
  onClose,
  mode = 'add',
  initialData = {},
  onSave,
  submittingLabel,
  buildings = [],
  fetchRooms = null
}) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: '',
    address: '',
    idProofType: '',
    idProofNumber: '',
    advancedAmount: 0,
    rentAmount: '',
    numberOfPersons: 1,
    building: '',
    room: '',
    moveInDate: '',
    moveOutDate: ''
  });

  const [availableRooms, setAvailableRooms] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [updatingMoveOut, setUpdatingMoveOut] = useState(false); // for moveOut-only update status
  const title = mode === 'edit' ? 'Edit Tenant' : 'Add Tenant';

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      fullName: initialData.fullName || '',
      email: initialData.email || '',
      phone: initialData.phone || '',
      gender: initialData.gender || '',
      address: initialData.address || '',
      idProofType: initialData.idProofType || '',
      idProofNumber: initialData.idProofNumber || '',
      advancedAmount: initialData.advancedAmount ?? 0,
      rentAmount: initialData.rentAmount ?? '',
      numberOfPersons: initialData.numberOfPersons ?? 1,
      building: initialData.room?.building?._id || initialData.building || '',
      room: initialData.room?._id || initialData.room || initialData.roomId || '',
      moveInDate: initialData.moveInDate ? toInputDate(initialData.moveInDate) : '',
      moveOutDate: initialData.moveOutDate ? toInputDate(initialData.moveOutDate) : ''
    });
    setErrors({});
    setSaving(false);
    setUpdatingMoveOut(false);
    setAvailableRooms([]);
    // if building present and fetchRooms provided, load rooms
    if (initialData.room?.building?._id && fetchRooms) {
      loadRoomsForBuilding(initialData.room.building._id || initialData.room.building);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData]);

  const toInputDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    return dt.toISOString().split('T')[0];
  };

  // load rooms when building changes (only if fetchRooms provided)
  useEffect(() => {
    if (!form.building) {
      setAvailableRooms([]);
      setForm(prev => ({ ...prev, room: '' }));
      return;
    }
    if (typeof fetchRooms === 'function') {
      loadRoomsForBuilding(form.building);
    } else {
      setAvailableRooms([]);
      setForm(prev => ({ ...prev, room: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.building]);

  const loadRoomsForBuilding = async (buildingId) => {
    try {
      const res = await fetchRooms(buildingId);
      const rooms = (res && res.data) ? res.data : [];
      const available = rooms.filter(r => !r.isBooked);
      // if editing and current room not in available, add it
      if (mode === 'edit' && form.room && !available.some(r => r._id === form.room)) {
        const curr = rooms.find(r => r._id === form.room);
        if (curr) available.push(curr);
      }
      setAvailableRooms(available);
    } catch (err) {
      console.error('loadRoomsForBuilding error', err);
      setAvailableRooms([]);
    }
  };

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    validateField(key, value);
  };

  const validateField = (key, value) => {
    let msg = '';

    if (key === 'fullName') {
      if (!value || !String(value).trim()) msg = 'Full name is required';
      else if (String(value).trim().length < 3) msg = 'Name must be at least 3 characters';
    }

    if (key === 'email') {
      if (!value || !String(value).trim()) msg = 'Email is required';
      else {
        const s = String(value).trim();
        if (!/^\S+@\S+\.\S+$/.test(s)) msg = 'Enter a valid email';
      }
    }

    if (key === 'rentAmount') {
      const n = Number(value);
      if (value === '' || isNaN(n)) msg = 'Rent amount is required';
      else if (n < 0) msg = 'Rent must be >= 0';
    }

    if (key === 'numberOfPersons') {
      const n = Number(value);
      if (!value || isNaN(n) || n < 1) msg = 'Enter number of persons (>=1)';
    }

    if (key === 'advancedAmount') {
      const n = Number(value);
      if (value !== '' && (isNaN(n) || n < 0)) msg = 'Advance must be >= 0';
    }

    if (key === 'phone') {
      if (value && !/^\+?\d{10}$/.test(value)) {
        msg = 'Phone must be 10 digits';
      }
    }

    if (key === 'room') {
      if (!value && fetchRooms) msg = 'Room is required';
    }

    setErrors(prev => ({ ...prev, [key]: msg }));
    return msg === '';
  };

  const validateAll = () => {
    const checks = {
      fullName: validateField('fullName', form.fullName),
      email: validateField('email', form.email),
      rentAmount: validateField('rentAmount', form.rentAmount),
      numberOfPersons: validateField('numberOfPersons', form.numberOfPersons),
      advancedAmount: validateField('advancedAmount', form.advancedAmount),
      phone: validateField('phone', form.phone),
      room: fetchRooms ? validateField('room', form.room) : true
    };
    return Object.values(checks).every(Boolean);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (!validateAll()) {
      return { ok: false, message: 'Please fix validation errors' };
    }

    // enforce the rule: if tenant is active (no moveOutDate) we must NOT send moveOutDate
    // if tenant is not active (has moveOutDate) we must NOT allow updating moveInDate
    const isActive = !initialData.moveOutDate; // tenant active iff no moveOutDate in initial data
    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone?.trim() || '',
      gender: form.gender || '',
      address: form.address || '',
      idProofType: form.idProofType?.trim() || '',
      idProofNumber: form.idProofNumber?.trim() || '',
      advancedAmount: Number(form.advancedAmount || 0),
      rentAmount: Number(form.rentAmount || 0),
      numberOfPersons: Number(form.numberOfPersons || 1),
      // include moveInDate only when allowed
      ...(form.moveInDate && (isActive || mode === 'add') ? { moveInDate: form.moveInDate } : {}),
      // include moveOutDate only when allowed (for edit mode and not active)
      ...(form.moveOutDate && (!isActive) ? { moveOutDate: form.moveOutDate } : {}),
      ...(form.building ? { building: form.building } : {}),
      ...(form.room ? { room: form.room } : {})
    };

    try {
      setSaving(true);
      if (typeof onSave === 'function') {
        await onSave(payload);
      }
      setSaving(false);
      return { ok: true };
    } catch (err) {
      setSaving(false);
      throw err;
    }
  };

  // Dedicated function to update only moveOutDate (calls onSave with minimal payload).
  // Respects the rule: only allowed when tenant is NOT active (i.e., moveOutDate already exists),
  // OR you may call this to set moveOutDate when allowed by your business rules.
  const handleUpdateMoveOutDate = async (dateStr) => {
    // dateStr should be 'YYYY-MM-DD' or empty to clear
    // determine active state from initialData (original tenant status)
    const wasActive = !initialData.moveOutDate;
    if (wasActive) {
      // active tenants aren't allowed to set moveOutDate via this action
      toast.error('Tenant is currently active — cannot set move-out date here. Use the "Mark Leave" flow instead.');
      return { ok: false, message: 'Tenant active; cannot update moveOutDate' };
    }

    if (!dateStr) {
      toast.error('Please provide a valid move-out date.');
      return { ok: false };
    }

    try {
      setUpdatingMoveOut(true);
      if (typeof onSave === 'function') {
        // call onSave with minimal payload — parent should accept partial updates
        await onSave({ moveOutDate: dateStr });
      }
      setUpdatingMoveOut(false);
      // update local form state to reflect saved date
      setForm(prev => ({ ...prev, moveOutDate: dateStr }));
      toast.success('Move-out date updated');
      return { ok: true };
    } catch (err) {
      setUpdatingMoveOut(false);
      toast.error(err?.response?.data?.message || 'Failed to update move-out date');
      return { ok: false, error: err };
    }
  };

  const submitDisabled = saving
    || !form.fullName
    || !form.email
    || form.rentAmount === ''
    || !form.numberOfPersons
    || Object.values(errors).some(Boolean);

  // Derived flags
  const tenantWasActive = !initialData.moveOutDate; // initial active status
  const isEditing = mode === 'edit';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <input
              className={`p-2 border rounded w-full ${errors.fullName ? 'border-red-500' : ''}`}
              placeholder="Full name *"
              value={form.fullName}
              onChange={e => handleChange('fullName', e.target.value)}
              required
            />
            {errors.fullName && <div className="text-xs text-red-600 mt-1">{errors.fullName}</div>}
          </div>

          <div>
            <input
              className={`p-2 border rounded w-full ${errors.email ? 'border-red-500' : ''}`}
              placeholder="Email *"
              type="email"
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
              required
            />
            {errors.email && <div className="text-xs text-red-600 mt-1">{errors.email}</div>}
          </div>

          <div>
            <input
              className={`p-2 border rounded w-full ${errors.phone ? 'border-red-500' : ''}`}
              placeholder="Phone (optional)"
              value={form.phone}
              onChange={e => handleChange('phone', e.target.value)}
            />
            {errors.phone && <div className="text-xs text-red-600 mt-1">{errors.phone}</div>}
          </div>

          <div>
            <select
              className="p-2 border rounded w-full"
              value={form.gender}
              onChange={e => handleChange('gender', e.target.value)}
            >
              <option value="">Gender (optional)</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <input
              className="p-2 border rounded w-full"
              placeholder="Address (optional)"
              value={form.address}
              onChange={e => handleChange('address', e.target.value)}
            />
          </div>

          <div>
            <input
              className="p-2 border rounded w-full"
              placeholder="ID proof type (Aadhaar, Voter ID...)"
              value={form.idProofType}
              onChange={e => handleChange('idProofType', e.target.value)}
            />
          </div>

          <div>
            <input
              className="p-2 border rounded w-full"
              placeholder="ID proof number"
              value={form.idProofNumber}
              onChange={e => handleChange('idProofNumber', e.target.value)}
            />
          </div>

          <div>
            <input
              className={`p-2 border rounded w-full ${errors.advancedAmount ? 'border-red-500' : ''}`}
              placeholder="Advance amount"
              type="number"
              min="0"
              value={form.advancedAmount}
              onChange={e => handleChange('advancedAmount', e.target.value)}
            />
            {errors.advancedAmount && <div className="text-xs text-red-600 mt-1">{errors.advancedAmount}</div>}
          </div>

          <div>
            <input
              className={`p-2 border rounded w-full ${errors.rentAmount ? 'border-red-500' : ''}`}
              placeholder="Rent amount *"
              type="number"
              min="0"
              value={form.rentAmount}
              onChange={e => handleChange('rentAmount', e.target.value)}
              required
            />
            {errors.rentAmount && <div className="text-xs text-red-600 mt-1">{errors.rentAmount}</div>}
          </div>

          <div>
            <input
              className={`p-2 border rounded w-full ${errors.numberOfPersons ? 'border-red-500' : ''}`}
              placeholder="Number of persons *"
              type="number"
              min="1"
              value={form.numberOfPersons}
              onChange={e => handleChange('numberOfPersons', e.target.value)}
              required
            />
            {errors.numberOfPersons && <div className="text-xs text-red-600 mt-1">{errors.numberOfPersons}</div>}
          </div>

          <div>
            <label className="block text-sm mb-1">Move-in date</label>
            <input
              className="p-2 border rounded w-full"
              type="date"
              value={form.moveInDate}
              onChange={e => handleChange('moveInDate', e.target.value)}
              // If tenant is not active (has moveOutDate already), disallow editing moveInDate
              disabled={isEditing && !tenantWasActive}
            />
            {isEditing && !tenantWasActive && <div className="text-xs text-gray-600 mt-1">Move-in cannot be changed after tenant has moved out.</div>}
          </div>

          <div>
            <label className="block text-sm mb-1">Move-out date</label>
            <input
              className="p-2 border rounded w-full"
              type="date"
              value={form.moveOutDate}
              onChange={e => handleChange('moveOutDate', e.target.value)}
              // If tenant is active (no moveOutDate initially), disallow setting moveOutDate here
              disabled={isEditing ? tenantWasActive : true /* in add mode, don't allow moveOut */ }
            />
            {isEditing && tenantWasActive && <div className="text-xs text-gray-600 mt-1">Tenant is active — move-out cannot be set here.</div>}
            {!isEditing && <div className="text-xs text-gray-600 mt-1">Move-out can be set only after tenant leaves (use Mark Leave).</div>}
          </div>

          {/* Optional building -> room selects */}
          <div>
            <select
              className="p-2 border rounded w-full"
              value={form.building}
              onChange={e => handleChange('building', e.target.value)}
            >
              <option value="">Select Building (optional)</option>
              {buildings.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            {fetchRooms ? (
              availableRooms.length === 0 ? (
                <div className="p-2 border rounded text-muted">No available rooms</div>
              ) : (
                <select
                  className={`p-2 border rounded w-full ${errors.room ? 'border-red-500' : ''}`}
                  value={form.room}
                  onChange={e => handleChange('room', e.target.value)}
                >
                  <option value="">Select Room *</option>
                  {availableRooms.map(r => (
                    <option key={r._id} value={r._id}>
                      {r.number}{r.floor ? ` - ${r.floor}` : ''}{r.isBooked ? ' (booked)' : ''}
                    </option>
                  ))}
                </select>
              )
            ) : (
              <input
                className="p-2 border rounded w-full"
                placeholder="Room ID (optional)"
                value={form.room}
                onChange={e => handleChange('room', e.target.value)}
              />
            )}
            {errors.room && <div className="text-xs text-red-600 mt-1">{errors.room}</div>}
          </div>
        </div>

        <div className="flex justify-between items-center gap-2 mt-4">
          <div>
            {/* If editing and tenant is not active (has a moveOutDate), show a quick Update Move-out button */}
            {isEditing && !tenantWasActive && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={form.moveOutDate}
                  onChange={e => handleChange('moveOutDate', e.target.value)}
                  className="p-2 border rounded"
                />
                <button
                  type="button"
                  onClick={() => handleUpdateMoveOutDate(form.moveOutDate)}
                  className="px-3 py-1 bg-yellow-600 text-white rounded"
                  disabled={updatingMoveOut || !form.moveOutDate}
                >
                  {updatingMoveOut ? 'Updating...' : 'Update Move-out'}
                </button>
                <div className="text-xs text-gray-600 ml-2">Updating move-out will only change move-out date (move-in locked).</div>
              </div>
            )}

            {/* If editing and tenant is active, provide info */}
            {isEditing && tenantWasActive && (
              <div className="text-sm text-gray-600">Tenant is active. To mark leaving, use the manager 'Mark Leave' flow (which will set move-out date).</div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-gray-500 text-white rounded"
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              onClick={(e) => {
                handleSubmit(e)
                  .then((res) => {
                    if (res && res.ok) {
                      onClose && onClose();
                    }
                  })
                  .catch(() => {
                    // server error handled by parent
                  });
              }}
              className={`px-3 py-1 rounded ${submitDisabled ? 'bg-gray-400 text-white' : 'bg-blue-600 text-white'}`}
              disabled={submitDisabled}
            >
              {saving ? 'Saving...' : (submittingLabel || (mode === 'edit' ? 'Save' : 'Add'))}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

TenantFormModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(['add', 'edit']),
  initialData: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  submittingLabel: PropTypes.string,
  buildings: PropTypes.array, // optional list of buildings to enable building->room
  fetchRooms: PropTypes.func // optional function(buildingId) => Promise({ data: rooms[] })
};
