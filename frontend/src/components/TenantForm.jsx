// frontend/src/components/TenantForm.jsx
import React, { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Form,
  Row,
  Col,
  Spinner,
  Card,
  InputGroup,
  Badge,
} from "react-bootstrap";
import { toast } from "react-toastify";
import { createTenant, updateTenant } from "../services/TenantService";
import { getRoomsByBuilding } from "../services/RoomService";
import { FaUser, FaHome, FaMoneyBillWave } from "react-icons/fa";
import {UserRoundPlus} from "lucide-react";

const ID_PROOF_OPTIONS = ["Aadhaar", "Voter ID", "PAN", "Passport", "Other"];

/* -------------------------
   Helpers
   ------------------------- */
// format phone for display (friendly)
function formatPhoneForDisplay(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return "";

  // 10 digits -> assume India +91
  if (digits.length === 10) return `+91 ${digits}`;

  // 12 digits starting with 91 -> +91 xxxxxxxxxx
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2)}`;
  }

  // >10 digits: split into +<cc> <rest>
  if (digits.length > 10) {
    const ccLen = digits.length - 10;
    const cc = digits.slice(0, ccLen);
    const rest = digits.slice(ccLen);
    return `+${cc} ${rest}`;
  }

  // fallback raw digits
  return digits;
}

// normalize phone for saving: strip non-digits
function normalizePhoneForSave(phone) {
  if (!phone) return "";
  return String(phone).replace(/\D/g, "");
}

// basic email validation
function isValidEmail(email) {
  if (!email) return false;
  // simple RFC-ish check, good for client-side validation
  const re =
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  return re.test(email.trim());
}

/* -------------------------
   Component
   ------------------------- */
const TenantForm = ({ tenant = null, room = null, buildings = [], onClose, onRefresh }) => {
  const editing = Boolean(tenant && tenant._id);
  const quickAdd = Boolean(room && !editing);

  // derive tenant status (for badges/field disabling)
  const tenantStatus = tenant?.moveOutDate
    ? "inactive"
    : tenant?.status?.toLowerCase() === "pending"
    ? "pending"
    : "active";
  const tenantActive = tenantStatus === "active";
  const tenantPending = tenantStatus === "pending";

  // form state
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    gender: "",
    address: "",
    idProofType: "",
    idProofNumber: "",
    advancedAmount: 0,
    rentAmount: 0,
    numberOfPersons: 1,
    moveInDate: new Date().toISOString().split("T")[0],
    moveOutDate: "",
    building: "",
    buildingName: "",
    room: "",
    roomNumber: "",
  });

  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialize form from props (tenant or quick-add room)
  useEffect(() => {
    // prefer tenant props, fallback to room
    const init = {
      fullName: tenant?.fullName || "",
      email: tenant?.email || "",
      // display-friendly phone
      phone: tenant?.phone ? formatPhoneForDisplay(tenant.phone) : "",
      gender: tenant?.gender || "",
      address: tenant?.address || "",
      idProofType: tenant?.idProofType || "",
      idProofNumber: tenant?.idProofNumber || "",
      advancedAmount: tenant?.advancedAmount ?? 0,
      rentAmount: tenant?.rentAmount ?? 0,
      numberOfPersons: tenant?.numberOfPersons ?? 1,
      moveInDate: tenant?.moveInDate ? tenant.moveInDate.split("T")[0] : new Date().toISOString().split("T")[0],
      moveOutDate: tenant?.moveOutDate ? tenant.moveOutDate.split("T")[0] : "",
      building: tenant?.room?.building?._id || room?.building?._id || "",
      buildingName: tenant?.room?.building?.name || room?.building?.name || "",
      room: tenant?.room?._id || room?._id || "",
      roomNumber: tenant?.room?.number || room?.number || "",
    };

    setForm(init);
    setErrors({});
    // load available rooms if adding (will be handled in another effect)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant, room]);

  // Load rooms for selected building (only when adding new tenant — not editing)
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
        // if quick-add or user hasn't selected a room, prefill first available
        if ((quickAdd || !form.room) && available.length > 0) {
          setForm((f) => ({ ...f, room: available[0]._id, roomNumber: available[0].number }));
        }
      } catch (err) {
        console.error("loadRooms error:", err);
        toast.error("Failed to load rooms for selected building");
        setAvailableRooms([]);
      } finally {
        setLoadingRooms(false);
      }
    };

    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.building, editing]);

  // small helper to update form fields
  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // validation
  const validate = () => {
    const newErrors = {};
    if (!form.fullName.trim()) newErrors.fullName = "Full Name is required";
    if (!form.email || !form.email.trim()) newErrors.email = "Email is required";
    else if (!isValidEmail(form.email)) newErrors.email = "Enter a valid email";
    if (!form.room) newErrors.room = "Room selection is required";
    if (!form.rentAmount || Number(form.rentAmount) <= 0) newErrors.rentAmount = "Rent Amount must be > 0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // submit/save
  const handleSave = async () => {
    if (!validate()) return;

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: normalizePhoneForSave(form.phone) || undefined,
      gender: form.gender || undefined,
      address: form.address || undefined,
      idProofType: form.idProofType || undefined,
      idProofNumber: form.idProofNumber || undefined,
      advancedAmount: Number(form.advancedAmount) || 0,
      rentAmount: Number(form.rentAmount),
      numberOfPersons: Number(form.numberOfPersons) || 1,
      moveInDate: form.moveInDate,
      moveOutDate: form.moveOutDate || undefined,
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
      console.error("TenantForm submit error:", err);
      toast.error(err?.response?.data?.message || "Failed to save tenant");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { borderRadius: "8px" };
  const cardStyle = { transition: "0.3s", cursor: "pointer" };
  const cardHoverStyle = { transform: "translateY(-3px)", boxShadow: "0 6px 18px rgba(0,0,0,0.15)" };

  const getStatusBadge = () => {
    if (tenantActive) return <Badge bg="success">Active</Badge>;
    if (tenantPending) return <Badge bg="warning">Pending Move-out</Badge>;
    return <Badge bg="secondary">Inactive</Badge>;
  };

  return (
    <Modal show={true} onHide={onClose} centered size="lg">
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title>
         <UserRoundPlus/> {editing ? "Edit Tenant" : "Add Tenant"} {editing && getStatusBadge()}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Room Info */}
        <Card
          className="mb-3 rounded"
          style={cardStyle}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, cardHoverStyle)}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, cardStyle)}
        >
          <Card.Header className="d-flex align-items-center bg-light">
            <FaHome className="me-2" /> Room Information
          </Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Building *</Form.Label>
                  <Form.Select
                    value={form.building}
                    onChange={(e) => {
                      const val = e.target.value;
                      const name = buildings.find((b) => b._id === val)?.name || "";
                      handleChange("building", val);
                      handleChange("buildingName", name);
                    }}
                    disabled={editing || quickAdd}
                    style={inputStyle}
                    isInvalid={!!errors.building}
                  >
                    {editing || quickAdd ? (
                      <option value={form.building}>{form.buildingName || "Building"}</option>
                    ) : (
                      <>
                        <option value="">Select Building</option>
                        {buildings.map((b) => (
                          <option key={b._id} value={b._id}>
                            {b.name}
                          </option>
                        ))}
                      </>
                    )}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Room *</Form.Label>
                  {loadingRooms ? (
                    <div className="d-flex align-items-center">
                      <Spinner size="sm" animation="border" /> Loading...
                    </div>
                  ) : (
                    <Form.Select
                      value={form.room}
                      onChange={(e) => {
                        const rid = e.target.value;
                        const rn = availableRooms.find((r) => r._id === rid)?.number || "";
                        handleChange("room", rid);
                        handleChange("roomNumber", rn);
                      }}
                      disabled={editing || quickAdd}
                      isInvalid={!!errors.room}
                      style={inputStyle}
                    >
                      {editing || quickAdd ? (
                        <option value={form.room}>{form.roomNumber || "Room"}</option>
                      ) : (
                        <>
                          <option value="">Select Room</option>
                          {availableRooms.map((r) => (
                            <option key={r._id} value={r._id}>
                              {r.number}
                            </option>
                          ))}
                        </>
                      )}
                    </Form.Select>
                  )}
                  <Form.Control.Feedback type="invalid">{errors.room}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Personal Info */}
        <Card
        className="mb-3 rounded"
        style={cardStyle}
        onMouseEnter={(e) => Object.assign(e.currentTarget.style, cardHoverStyle)}
        onMouseLeave={(e) => Object.assign(e.currentTarget.style, cardStyle)}
      >
        <Card.Header className="d-flex align-items-center bg-light">
          <FaUser className="me-2" /> Personal Information
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            {/* Full Name */}
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label>Full Name *</Form.Label>
                <Form.Control
                  type="text"
                  value={form.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  placeholder="Tenant full name"
                  isInvalid={!!errors.fullName}
                  style={inputStyle}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.fullName}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Email */}
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label>Email *</Form.Label>
                <Form.Control
                  type="email"
                  value={form.email}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleChange("email", val);
                    if (val && !isValidEmail(val))
                      setErrors((prev) => ({ ...prev, email: "Invalid email format" }));
                    else setErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  placeholder="tenant@example.com"
                  isInvalid={!!errors.email}
                  style={inputStyle}
                />
                {errors.email && (
                  <div className="text-danger small mt-1">{errors.email}</div>
                )}
              </Form.Group>
            </Col>

            {/* Phone */}
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label>Phone *</Form.Label>
                <Form.Control
                  type="text"
                  value={form.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^\d+]/g, "");
                    handleChange("phone", val);
                    const digits = val.replace(/\D/g, "");
                    if (digits.length !== 10)
                      setErrors((prev) => ({
                        ...prev,
                        phone: "Phone number must be exactly 10 digits",
                      }));
                    else setErrors((prev) => ({ ...prev, phone: "" }));
                  }}
                  placeholder="+91 xxxxxxxxxx"
                  isInvalid={!!errors.phone}
                  style={inputStyle}
                />
                {errors.phone && (
                  <div className="text-danger small mt-1">{errors.phone}</div>
                )}
              </Form.Group>
            </Col>

            {/* Gender */}
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label>Gender</Form.Label>
                <Form.Select
                  value={form.gender}
                  onChange={(e) => handleChange("gender", e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Address */}
            <Col xs={12}>
              <Form.Group>
                <Form.Label>Address</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Optional"
                  style={inputStyle}
                />
              </Form.Group>
            </Col>

            {/* ID Proof Type */}
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label>ID Proof Type</Form.Label>
                <Form.Select
                  value={form.idProofType}
                  onChange={(e) => handleChange("idProofType", e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Select ID Proof</option>
                  {ID_PROOF_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* ID Proof Number */}
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label>ID Proof Number</Form.Label>
                <Form.Control
                  type="text"
                  value={form.idProofNumber}
                  onChange={(e) => handleChange("idProofNumber", e.target.value)}
                  style={inputStyle}
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>


        {/* Rental Info */}
        <Card
          className="rounded"
          style={cardStyle}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, cardHoverStyle)}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, cardStyle)}
        >
          <Card.Header className="d-flex align-items-center bg-light">
            <FaMoneyBillWave className="me-2" /> Rental Information
          </Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Advanced Amount</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>₹</InputGroup.Text>
                    <Form.Control
                      type="number"
                      min="0"
                      value={form.advancedAmount}
                      onChange={(e) => handleChange("advancedAmount", e.target.value)}
                      style={inputStyle}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Number of Persons</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={form.numberOfPersons}
                    onChange={(e) => handleChange("numberOfPersons", e.target.value)}
                    style={inputStyle}
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Rent Amount *</Form.Label>
                  <InputGroup hasValidation>
                    <InputGroup.Text>₹</InputGroup.Text>
                    <Form.Control
                      type="number"
                      min="0"
                      value={form.rentAmount}
                      onChange={(e) => handleChange("rentAmount", e.target.value)}
                      isInvalid={!!errors.rentAmount}
                      style={inputStyle}
                    />
                    <Form.Control.Feedback type="invalid">{errors.rentAmount}</Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Move-in Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={form.moveInDate}
                    onChange={(e) => handleChange("moveInDate", e.target.value)}
                    disabled={!tenantActive && editing}
                    style={inputStyle}
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Move-out Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={form.moveOutDate}
                    onChange={(e) => handleChange("moveOutDate", e.target.value)}
                    disabled={tenantActive || !editing}
                    style={inputStyle}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-end">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="success" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Saving...
            </>
          ) : editing ? (
            "Update Tenant"
          ) : (
            "Add Tenant"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TenantForm;
