// frontend/src/components/ManagerTenantForm.jsx
import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Row, Col, InputGroup, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import { createTenant, updateTenant } from "../services/ManagerTenantService";
import { getRoomsByBuilding } from "../services/RoomService";

const ID_PROOF_OPTIONS = ["Aadhaar", "Voter ID", "PAN", "Passport", "Other"];

const ManagerTenantForm = ({ tenant, room, buildings, onClose, onRefresh }) => {
  const editing = Boolean(tenant?._id);
  const quickAdd = Boolean(room && !editing); // true if room prop provided and not editing

  const [form, setForm] = useState({
    fullName: tenant?.fullName || "",
    email: tenant?.email || "",
    phone: tenant?.phone || "",
    gender: tenant?.gender || "",
    address: tenant?.address || "",
    idProofType: tenant?.idProofType || "",
    idProofNumber: tenant?.idProofNumber || "",
    advancedAmount: tenant?.advancedAmount || 0,
    rentAmount: tenant?.rentAmount || 0,
    numberOfPersons: tenant?.numberOfPersons || 1,
    moveInDate: tenant?.moveInDate
      ? tenant.moveInDate.split("T")[0]
      : new Date().toISOString().split("T")[0],
    building: tenant?.room?.building?._id || room?.building?._id || "",
    room: tenant?.room?._id || room?._id || "",
  });

  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load rooms dynamically if building changes and this is Add form
  useEffect(() => {
    const loadRooms = async () => {
      if (!form.building || editing) {
        setAvailableRooms([]);
        return;
      }
      try {
        setLoadingRooms(true);
        const res = await getRoomsByBuilding(form.building);
        const available = (res.data || []).filter((r) => !r.isBooked);
        setAvailableRooms(available);
        if (!quickAdd) setForm((f) => ({ ...f, room: available.length ? available[0]._id : "" }));
      } catch (err) {
        console.error("loadRooms error:", err);
        toast.error("Failed to load rooms");
      } finally {
        setLoadingRooms(false);
      }
    };
    loadRooms();
  }, [form.building, editing, quickAdd]);

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSave = async () => {
    // Basic validation
    if (!form.fullName || !form.email || !form.room || !form.rentAmount) {
      return toast.error("Full Name, Email, Room, and Rent Amount are required");
    }

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone ? String(form.phone).replace(/\D/g, "") : undefined,
      gender: form.gender || undefined,
      address: form.address || undefined,
      idProofType: form.idProofType || undefined,
      idProofNumber: form.idProofNumber || undefined,
      advancedAmount: Number(form.advancedAmount) || 0,
      rentAmount: Number(form.rentAmount),
      numberOfPersons: Number(form.numberOfPersons) || 1,
      moveInDate: form.moveInDate,
      room: form.room,
    };

    try {
      setSaving(true);
      if (editing) {
        await updateTenant(tenant._id, payload);
        toast.success("Tenant updated successfully");
      } else {
        await createTenant(payload);
        toast.success("Tenant added successfully");
      }
      onRefresh && onRefresh();
      onClose && onClose();
    } catch (err) {
      console.error("ManagerTenantForm submit error:", err);
      toast.error(err?.response?.data?.message || "Failed to save tenant");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={true} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{editing ? "Edit Tenant" : "Add Tenant"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Full Name *</Form.Label>
                <Form.Control
                  type="text"
                  value={form.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  placeholder="Tenant full name"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Email *</Form.Label>
                <Form.Control
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="tenant@example.com"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Phone</Form.Label>
                <Form.Control
                  type="text"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value.replace(/\D/g, ""))}
                  placeholder="Optional"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Gender</Form.Label>
                <Form.Select
                  value={form.gender}
                  onChange={(e) => handleChange("gender", e.target.value)}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Address</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Optional"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>ID Proof Type</Form.Label>
                <Form.Select
                  value={form.idProofType}
                  onChange={(e) => handleChange("idProofType", e.target.value)}
                >
                  <option value="">Select ID Proof</option>
                  {ID_PROOF_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>ID Proof Number</Form.Label>
                <Form.Control
                  type="text"
                  value={form.idProofNumber}
                  onChange={(e) => handleChange("idProofNumber", e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Advanced Amount</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  value={form.advancedAmount}
                  onChange={(e) => handleChange("advancedAmount", e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Number of Persons</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={form.numberOfPersons}
                  onChange={(e) => handleChange("numberOfPersons", e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Move-in Date *</Form.Label>
                <Form.Control
                  type="date"
                  value={form.moveInDate}
                  onChange={(e) => handleChange("moveInDate", e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Rent Amount *</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  value={form.rentAmount}
                  onChange={(e) => handleChange("rentAmount", e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Building *</Form.Label>
                <Form.Select
                  value={form.building}
                  onChange={(e) => handleChange("building", e.target.value)}
                  disabled={editing || quickAdd} // building fixed in edit or quick add
                >
                  <option value="">Select Building</option>
                  {buildings.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Room *</Form.Label>
                {loadingRooms ? (
                  <div className="d-flex align-items-center"><Spinner size="sm" animation="border" /> Loading...</div>
                ) : (
                  <Form.Select
                    value={form.room}
                    onChange={(e) => handleChange("room", e.target.value)}
                    disabled={editing || quickAdd} // read-only in edit or pre-selected quick add
                  >
                    <option value="">Select Room</option>
                    {availableRooms.map((r) => (
                      <option key={r._id} value={r._id}>{r.number}</option>
                    ))}
                    {quickAdd && form.room && !availableRooms.some(r => r._id === form.room) && (
                      <option value={form.room}>{form.roomNumber || "Selected Room"}</option>
                    )}
                  </Form.Select>
                )}
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="success" onClick={handleSave} disabled={saving}>
          {saving ? <><Spinner animation="border" size="sm" className="me-2" />Saving...</> : editing ? "Update Tenant" : "Add Tenant"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ManagerTenantForm;
