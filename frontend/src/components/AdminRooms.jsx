// src/pages/AdminRooms.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { toast } from "react-toastify";
import { getBuildings } from "../services/BuildingService";
import {
  getAllRooms,
  createRoom,
  updateRoom,
} from "../services/RoomService";
import { markLeaveTenant } from "../services/ManagerTenantService";

import TenantForm from "../components/TenantForm";
import TenantView from "../components/TenantView";
import IconDropdown from "../components/IconDropdown";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Spinner,
  Modal,
  Form,
  InputGroup,
  ToggleButton,
  ButtonGroup,
} from "react-bootstrap";
import {
  House,
  User,
  Phone,
  PlusCircle,
  Eye,
  Edit,
  Search,
  LogOut,
  UserRoundPlus,
  HousePlus,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import "react-toastify/dist/ReactToastify.css";

/** ========== Room Card Component ========== */
const RoomCard = ({
  r,
  getActiveTenant,
  formattedRent,
  onEditRoom,
  openAddTenant,
  openViewTenant,
  openEditTenant,
  openMarkLeave,
}) => {
  const t = getActiveTenant(r);

  const buildingName =
    (typeof r.building === "object" ? r.building?.name : r.building) || "-";
  const roomNumber = r.number || "-";
  const phone = t?.phone || t?.mobile || r.phone || r.mobile || "-";
  const tenantName = t?.fullName || t?.name || "—";

  const moveIn = t?.moveInDate
    ? new Date(t.moveInDate).toLocaleDateString()
    : "-";
  const moveOut = t?.moveOutDate
    ? new Date(t.moveOutDate).toLocaleDateString()
    : null;

  const status =
    t && t.moveOutDate
      ? "Left"
      : r.isBooked
      ? "Booked"
      : "Available";

  const pastelStyle = t?.moveOutDate
    ? { backgroundColor: "#fdecea", border: "1px solid #f5c2c7", color: "#6c757d" }
    : r.isBooked
    ? { backgroundColor: "#fff4e5", border: "1px solid #ffd699", color: "#995c00" }
    : { backgroundColor: "#e8f8ef", border: "1px solid #b4e2c1", color: "#146c43" };

  return (
    <Card
      className="h-100 shadow-sm border-0"
      style={{
        borderRadius: 12,
        cursor: "pointer",
        transition: "transform .12s ease, box-shadow .12s ease",
        ...pastelStyle,
      }}
      onClick={() => (t ? openViewTenant(r) : openAddTenant(r))}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      <Card.Body className="d-flex flex-column justify-content-between">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <House size={18} className="text-muted" />
            <div>
              <div className="small text-muted">Location</div>
              <div className="fw-medium text-truncate">
                {buildingName} - {roomNumber}
              </div>
            </div>
          </div>

          <div className="text-end">
            <Badge
              bg={
                status === "Booked"
                  ? "danger"
                  : status === "Left"
                  ? "secondary"
                  : "success"
              }
              className="py-1 px-2"
              style={{ borderRadius: 999 }}
            >
              {status}
            </Badge>

            <IconDropdown
              actions={[
                {
                  icon: Eye,
                  label: "View",
                  handler: (e) => {
                    e.stopPropagation();
                    openViewTenant(r);
                  },
                },
                {
                  icon: Edit,
                  label: "Edit Room",
                  handler: (e) => {
                    e.stopPropagation();
                    onEditRoom(r);
                  },
                },
                t && {
                  icon: LogOut,
                  label: "Mark Leave",
                  handler: (e) => {
                    e.stopPropagation();
                    openMarkLeave(r);
                  },
                },
              ].filter(Boolean)}
              showText
            />
          </div>
        </div>

        <div className="mb-2">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <User size={16} className="text-muted" />
              <div className="fw-bold text-truncate">{tenantName}</div>
            </div>
            <Badge
              bg="light"
              text="dark"
              className="border"
              title="Click to copy ID"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(t?.tenantId || t?._id || "");
                toast.info("Tenant ID copied");
              }}
            >
              ID:{" "}
              <span className="fw-medium ms-1">
                {t?.tenantId || t?._id || "-"}
              </span>
            </Badge>
          </div>

          <div className="d-flex justify-content-between mt-2 align-items-center">
            <div className="d-flex align-items-center gap-2">
              <Phone size={14} className="text-muted" />
              <div className="fw-medium text-truncate">{phone}</div>
            </div>
            <Badge bg="dark" text="light" className="border">
              Rent:{" "}
              <span className="fw-medium ms-1">{formattedRent(r, t)}</span>
            </Badge>
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="small text-muted">
            {moveOut ? "Move out" : "Move in"}
          </div>
          <div className="fw-medium">{moveOut || moveIn}</div>
        </div>
      </Card.Body>
    </Card>
  );
};



/** ========== Main Component ========== */
const AdminRooms = () => {
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomNumber, setRoomNumber] = useState("");
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [addRoomBuildingId, setAddRoomBuildingId] = useState("");
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showMarkLeaveModal, setShowMarkLeaveModal] = useState(false);
  const [markLeaveTarget, setMarkLeaveTarget] = useState(null);
  const [markLeaveDate, setMarkLeaveDate] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const searchRef = useRef(null);

  useEffect(() => { loadBuildings(); fetchAllRooms(); }, []);
  const loadBuildings = async () => {
    try {
      const res = await getBuildings();
      setBuildings(res.data || []);
    } catch { toast.error("Failed to load buildings"); }
  };
  const fetchAllRooms = async () => {
    try {
      setLoading(true);
      const res = await getAllRooms();
      setRooms(res.data || []);
    } catch { toast.error("Failed to load rooms"); }
    finally { setLoading(false); }
  };

  const normalizeTenants = (r) => Array.isArray(r.tenants) ? r.tenants : [];
  const getActiveTenant = (r) => normalizeTenants(r).find((t) => !t.moveOutDate);
  const formattedRent = (r, t) => {
    const rent = Number(t?.rentAmount ?? r?.rent ?? 0);
    return rent ? `₹${rent.toFixed(2)}` : "-";
  };

  const openAddTenant = (room) => setSelectedTenant({ room, mode: "add" });
  const openViewTenant = (room) => setSelectedTenant({ room, mode: "view", tenant: getActiveTenant(room) });
  const openEditTenant = (room) => setSelectedTenant({ room, mode: "edit", tenant: getActiveTenant(room) });

  const openMarkLeave = (room) => {
    const tenant = getActiveTenant(room);
    if (!tenant) return toast.info("No active tenant to mark leave.");
    setMarkLeaveTarget(tenant);
    setMarkLeaveDate(new Date().toISOString().split("T")[0]);
    setShowMarkLeaveModal(true);
  };

  const confirmMarkLeave = async () => {
    if (!markLeaveTarget || !markLeaveDate) return toast.warn("Select leave date");
    try {
      await markLeaveTenant(markLeaveTarget._id, markLeaveDate);
      await fetchAllRooms();
      setShowMarkLeaveModal(false);
      toast.success("Tenant marked as left");
    } catch { toast.error("Failed to mark leave"); }
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filteredRooms = useMemo(() => {
    let data = [...rooms];
    if (statusFilter !== "all")
      data = data.filter((r) => (statusFilter === "booked" ? r.isBooked : !r.isBooked));
    if (debouncedSearch)
      data = data.filter((r) => {
        const q = debouncedSearch;
        const b = r.building?.name?.toLowerCase() || "";
        const rn = (r.number || "").toString().toLowerCase();
        const t = getActiveTenant(r);
        return (
          rn.includes(q) ||
          b.includes(q) ||
          t?.fullName?.toLowerCase().includes(q) ||
          (t?.tenantId || t?._id || "").toString().toLowerCase().includes(q)
        );
      });
    return data;
  }, [rooms, statusFilter, debouncedSearch]);

  const openRoomModal = (room = null) => {
    setEditingRoomId(room?._id || null);
    setRoomNumber(room?.number || "");
    setAddRoomBuildingId("");
    setShowRoomModal(true);
  };
  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    if (!roomNumber.trim()) return toast.error("Enter room number");
    try {
      if (editingRoomId) await updateRoom(editingRoomId, { number: roomNumber });
      else if (addRoomBuildingId) await createRoom({ number: roomNumber, buildingId: addRoomBuildingId });
      else return toast.error("Choose building");
      await fetchAllRooms();
      setShowRoomModal(false);
    } catch { toast.error("Failed to save room"); }
  };

  return (
    <Container fluid className="page-container">
      {/* Header - fixed size */}
      <div className="page-header d-flex justify-content-between flex-wrap align-items-start mb-2">
        <div>
          <h3 className="mb-1">Manage Rooms</h3>
          <div className="small text-muted">Manage rooms & tenants</div>
        </div>

        <div className="d-flex gap-2 align-items-center mt-2">
          <InputGroup className="search-input">
            <div
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 2,
              }}
            >
              <Search size={16} className="text-muted" />
            </div>
            <Form.Control
              style={{ paddingLeft: 36, borderRadius: 10 }}
              placeholder="Search by room, building, tenant or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              ref={searchRef}
            />
            <Button variant="outline-secondary" onClick={() => { setSearch(""); setDebouncedSearch(""); }}>
              Clear
            </Button>
          </InputGroup>

          <Button variant="primary" onClick={() => openRoomModal()}>
            <HousePlus size={16} className="me-1" />
            <span className="d-none d-sm-inline"></span>
          </Button>
        </div>
      </div>

      {/* Content - grows and can scroll internally */}
      <div className="page-content">
        <Card className="rooms-card mb-3">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <strong>Rooms</strong>
                <div className="small text-muted">{filteredRooms.length} / {rooms.length} shown</div>
              </div>
              <ButtonGroup>
                {["all", "booked", "available"].map((f) => (
                  <ToggleButton key={f} id={f} type="radio"
                    variant={statusFilter === f ? "secondary" : "outline-secondary"}
                    value={f} checked={statusFilter === f} onChange={() => setStatusFilter(f)}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </ToggleButton>
                ))}
                <Button variant="outline-secondary" className="ms-2" onClick={fetchAllRooms}>
                  <RefreshCw size={16} className="me-1" />
                </Button>
              </ButtonGroup>
            </div>

            {/* Scrollable area for rooms grid */}
            <div className="rooms-scroll">
              {loading ? (
                <div className="text-center py-4"><Spinner /></div>
              ) : filteredRooms.length === 0 ? (
                <div className="text-center text-muted py-4">No rooms found</div>
              ) : (
                <Row xs={1} sm={1} md={2} lg={3} className="g-3">
                  {filteredRooms.map((r) => (
                    <Col key={r._id} className="room-col">
                      <RoomCard
                        r={r}
                        getActiveTenant={getActiveTenant}
                        formattedRent={formattedRent}
                        onEditRoom={openRoomModal}
                        openAddTenant={openAddTenant}
                        openViewTenant={openViewTenant}
                        openEditTenant={openEditTenant}
                        openMarkLeave={openMarkLeave}
                      />
                    </Col>
                  ))}
                </Row>
              )}
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Tenant Modals */}
      {selectedTenant && ["add", "edit"].includes(selectedTenant.mode) && (
        <TenantForm
          key={selectedTenant.room._id}
          room={selectedTenant.room}
          tenant={selectedTenant.tenant}
          onClose={() => setSelectedTenant(null)}
          onRefresh={() => { fetchAllRooms(); setSelectedTenant(null); }}
        />
      )}
      {selectedTenant?.mode === "view" && selectedTenant.tenant && (
        <TenantView tenant={selectedTenant.tenant} onClose={() => setSelectedTenant(null)} />
      )}

      {/* Mark Leave */}
      <Modal show={showMarkLeaveModal} onHide={() => setShowMarkLeaveModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Mark Leave</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Leave Date</Form.Label>
            <Form.Control type="date" value={markLeaveDate} onChange={(e) => setMarkLeaveDate(e.target.value)} />
          </Form.Group>
          <div className="mt-3">
            <div><strong>Tenant:</strong> {markLeaveTarget?.fullName || "-"}</div>
            <div className="small text-muted">ID: {markLeaveTarget?._id || "-"}</div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMarkLeaveModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={confirmMarkLeave}>Confirm</Button>
        </Modal.Footer>
      </Modal>

      {/* Add/Edit Room */}
      <Modal show={showRoomModal} onHide={() => setShowRoomModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingRoomId ? "Edit Room" : "Add Room"}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleRoomSubmit}>
          <Modal.Body>
            {!editingRoomId && (
              <Form.Group className="mb-3">
                <Form.Label>Select Building</Form.Label>
                <Form.Select value={addRoomBuildingId} onChange={(e) => setAddRoomBuildingId(e.target.value)}>
                  <option value="">Choose building</option>
                  {buildings.map((b) => <option key={b._id} value={b._1}>{b.name}</option>)}
                </Form.Select>
              </Form.Group>
            )}
            <Form.Group>
              <Form.Label>Room Number</Form.Label>
              <Form.Control type="text" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowRoomModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">{editingRoomId ? "Update" : "Add"}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default AdminRooms;
