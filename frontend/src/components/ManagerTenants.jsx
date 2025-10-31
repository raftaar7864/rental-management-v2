// frontend/src/components/ManagerTenants.jsx
import React, { useEffect, useState, useContext, useMemo, useRef } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Modal,
  Form,
  Spinner,
  Badge,
  InputGroup,
  ToggleButton,
  ButtonGroup,
} from "react-bootstrap";
import { toast } from "react-toastify";
import { AuthContext } from "../context/AuthContext";
import { getTenantsByBuildings, markLeaveTenant } from "../services/ManagerTenantService";
import { getRoomsForManager } from "../services/RoomService";
import IconDropdown from "./IconDropdown";
import { House, User, Phone, Eye, Edit, Trash2,UserRoundPlus, LogOut, Search } from "lucide-react";
import TenantView from "./TenantView";
import TenantForm from "./TenantForm";


/**
 * ManagerTenants - card-based UI similar to AdminTenants
 *
 * - Card shows: Building - Room (top), Tenant Name, Tenant ID badge, Phone
 * - Footer shows Move in (or Move out if tenant left)
 * - Left tenants have tinted background + muted text
 * - IconDropdown used for actions (View/Edit/Delete/Mark Leave)
 * - Search bar filters on name / tenantId / phone
 */

export default function ManagerTenants() {
  const { user } = useContext(AuthContext);

  // Assigned building IDs & names
  const { assignedBuildingIds, assignedBuildingNames } = (() => {
    if (!user) return { assignedBuildingIds: [], assignedBuildingNames: [] };
    if (user.assignedBuildings?.length) {
      const ids = user.assignedBuildings.map((b) => (typeof b === "string" ? b : b._id));
      const names = user.assignedBuildings.map((b) => (typeof b === "string" ? b : b.name || b._id));
      return { assignedBuildingIds: ids, assignedBuildingNames: names };
    }
    if (user.assignedBuilding) {
      const id =
        typeof user.assignedBuilding === "string" ? user.assignedBuilding : user.assignedBuilding._id;
      const name =
        typeof user.assignedBuilding === "string"
          ? user.assignedBuilding
          : user.assignedBuilding.name || id;
      return { assignedBuildingIds: [id], assignedBuildingNames: [name] };
    }
    if (user.building) {
      const id = typeof user.building === "string" ? user.building : user.building._id;
      const name = typeof user.building === "string" ? user.building : user.building.name || id;
      return { assignedBuildingIds: [id], assignedBuildingNames: [name] };
    }
    return { assignedBuildingIds: [], assignedBuildingNames: [] };
  })();

  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Modals & form
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveTenantId, setLeaveTenantId] = useState(null);
  const [leaveDate, setLeaveDate] = useState("");
  const [viewTenant, setViewTenant] = useState(null);
  const [showTenantView, setShowTenantView] = useState(false);

  // Quick Add
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [roomsForBuilding, setRoomsForBuilding] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");


  // Search + filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | left
  const searchRef = useRef(null);

  // Load manager rooms
  const loadRooms = async () => {
    try {
      setLoadingRooms(true);
      const res = await getRoomsForManager();
      setRooms(res.data || []);
    } catch (err) {
      console.error("loadRooms:", err);
      toast.error("Failed to load rooms");
      setRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  };

  // Load tenants
  const loadTenants = async () => {
    if (!assignedBuildingIds.length) {
      setTenants([]);
      return;
    }
    try {
      setLoadingTenants(true);
      const res = await getTenantsByBuildings(assignedBuildingIds);
      setTenants(res.data || []);
    } catch (err) {
      console.error("loadTenants:", err);
      toast.error("Failed to load tenants");
      setTenants([]);
    } finally {
      setLoadingTenants(false);
    }
  };

  useEffect(() => {
    loadRooms();
    loadTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quick Add
  const openQuickAdd = () => {
    setSelectedBuilding(assignedBuildingIds[0] || "");
    setShowQuickAdd(true);
  };


  useEffect(() => {
    if (!selectedBuilding) {
      setRoomsForBuilding([]);
      setSelectedRoomId("");
      return;
    }
    const filtered = rooms.filter((r) => (r.building?._id || r.building) === selectedBuilding && !r.isBooked);
    setRoomsForBuilding(filtered);
    setSelectedRoomId(filtered.length ? filtered[0]._id : "");
  }, [selectedBuilding, rooms]);

  const confirmQuickAdd = () => {
    if (!selectedRoomId) return toast.error("Select a room first");
    const room = roomsForBuilding.find((r) => r._id === selectedRoomId);
    setShowQuickAdd(false);
    setEditingTenant(null);
    setShowFormModal(true);
    setSelectedRoomId(room._id);
  };

  // Add / Edit
  const openAdd = (room = null) => {
    setEditingTenant(null);
    if (room) setSelectedRoomId(room._id);
    setShowFormModal(true);
  };
  const openEdit = (t) => {
    setEditingTenant(t);
    setShowFormModal(true); // open the TenantForm modal (edit)
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditingTenant(null);
    setSelectedRoomId("");
  };
  // call this after a successful add/edit from the form
const onTenantFormSuccess = async () => {
  setShowFormModal(false);
  setEditingTenant(null);
  setSelectedRoomId("");
  // reload tenants and rooms
  await loadTenants();
  await loadRooms();
};
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch((searchTerm || "").trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Mark Leave
  const openMarkLeave = (t) => {
    setLeaveTenantId(t._id);
    setLeaveDate(new Date().toISOString().split("T")[0]);
    setShowLeaveModal(true);
  };
  const confirmLeave = async () => {
    if (!leaveTenantId || !leaveDate) return toast.error("Select leave date");
    try {
      await markLeaveTenant(leaveTenantId, leaveDate);
      toast.success("Tenant marked as left");
      setShowLeaveModal(false);
      setLeaveTenantId(null);
      setLeaveDate("");
      await loadTenants();
      await loadRooms();
    } catch (err) {
      console.error("confirmLeave:", err);
      toast.error("Failed to mark leave");
    }
  };

  // Delete tenant
  const handleDelete = async (t) => {
    // Use existing manager API if available — otherwise reuse service
    try {
      // fallback: mark as left or call delete API if exists. Using getTenantsByBuildings used earlier.
      if (!window.confirm("Delete tenant? This will remove tenant record.")) return;
      // Assuming delete endpoint exists on ManagerTenantService - if not, you can call shared deleteTenant service instead.
      // Here we'll call markLeave (safe) – but better to call delete endpoint if available.
      // await deleteTenant(t._id);
      toast.info("Delete action not wired. Implement deleteTenant API call if needed.");
      await loadTenants();
    } catch (err) {
      console.error("handleDelete:", err);
      toast.error("Failed to delete tenant");
    }
  };

  // Search + filter (name / tenantId / phone)
  const filteredTenants = useMemo(() => {
    const term = (searchTerm || "").trim().toLowerCase();
    return tenants.filter((t) => {
      if (statusFilter === "active" && t.moveOutDate) return false;
      if (statusFilter === "left" && !t.moveOutDate) return false;
      if (!term) return true;
      const name = (t.fullName || "").toLowerCase();
      const tid = (t.tenantId || "").toLowerCase();
      const phone = (t.phone || "").toLowerCase();
      return name.includes(term) || tid.includes(term) || phone.includes(term);
    });
  }, [tenants, searchTerm, statusFilter]);

  const shownCount = filteredTenants.length;
  const totalCount = tenants.length;

  const copyId = async (id) => {
    try {
      await navigator.clipboard.writeText(id || "");
      toast.success("Tenant ID copied");
    } catch {
      toast.error("Unable to copy");
    }
  };

  // Tenant card component (local)
  const TenantCard = ({ t }) => {
    const {
      _id,
      fullName = "-",
      tenantId = "-",
      phone = "-",
      moveInDate,
      moveOutDate,
      room,

    } = t || {};

    const buildingName = room?.building?.name || (room?.building || "-");
    const roomNumber = room?.number || "-";
    const status = moveOutDate ? "Left" : "Active";
    const moveIn = moveInDate ? new Date(moveInDate).toLocaleDateString() : "-";

    return (
      <Card
        className={`h-100 shadow-sm border-0 ${moveOutDate ? "tenant-left" : "tenant-active"}`}
        style={{
          borderRadius: 12,
          cursor: "pointer",
          transition: "transform .12s ease, box-shadow .12s ease",
          backgroundColor: moveOutDate ? "#fdecea" : "#e5f8ddff",
          border: moveOutDate ? "1px solid #f5c2c7" : "1px solid #eaeaea",
          color: moveOutDate ? "#6c757d" : "#212529",
        }}
          onClick={() => {
            setViewTenant(t);
            setShowTenantView(true);
        }}
        role="button"
        aria-label={`Open tenant ${fullName} details`}
      >
        <Card.Body className="d-flex flex-column justify-content-between">
          {/* Top: location + status + actions */}
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <House size={18} className="text-muted" />
              <div>
                <div className="small text-muted">Location</div>
                <div className="fw-medium text-truncate">
                  {buildingName} - {roomNumber}
                </div>
              </div>
            </div>

            <div style={{ minWidth: 80 }} className="text-end">
              <Badge
                bg={status === "Active" ? "success" : "secondary"}
                className="py-1 px-2"
                style={{ borderRadius: 999 }}
              >
                {status}
              </Badge>
                <IconDropdown
                  actions={[
                    { icon: Eye, title: "View", label: "View", handler: () => { setViewTenant(t); setShowTenantView(true); } },
                    { icon: Edit, title: "Edit", label: "Edit", handler: () => openEdit(t) },
                    !moveOutDate && {
                      icon: LogOut,
                      title: "Mark Leave",
                      label: "Mark Leave",
                      handler: () => openMarkLeave(t),
                    },
                  ].filter(Boolean)}
                  showText
                  hoverToOpen={false}
                />
              </div>
            </div>

          {/* Middle: name, id, phone */}
          <div className="mb-2">
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                <User size={16} className="text-muted" />
                <div className="fs-6 fw-bold text-truncate">{fullName}</div>
              </div>

              <Badge
                bg="light"
                text="dark"
                className="border"
                style={{ cursor: "pointer" }}
                onClick={(e) => { e.stopPropagation(); copyId(tenantId); }}
                title="Click to copy ID"
              >
                ID: <span className="fw-medium ms-1">{tenantId}</span>
              </Badge>
            </div>

            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                <Phone size={14} className="text-muted" />{phone || "-"}
              </div>

              <Badge
                bg="dark"
                text="light"
                className="border"
                style={{ cursor: "pointer" }}
              >
              Rent: <span className="fw-medium ms-1">{ (t.rentAmount ?? t.rent ?? t.monthlyRent) !== undefined && (t.rentAmount ?? t.rent ?? t.monthlyRent) !== null
                  ? `₹${Number(t.rentAmount ?? t.rent ?? t.monthlyRent).toFixed(2)}`
                  : "-"
                }</span>
              </Badge>
            </div>

          </div>

          {/* Footer: move in / move out */}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div className="small text-muted">{moveOutDate ? "Move out" : "Move in"}</div>
            <div className="fw-medium">
              {moveOutDate ? new Date(moveOutDate).toLocaleDateString() : moveIn}
            </div>
          </div>
        </Card.Body>
      </Card>
    );
  };

  const buildingDisplay = () => {
    if (!assignedBuildingNames.length) return "No building assigned";
    if (assignedBuildingNames.length === 1) return assignedBuildingNames[0];
    const firstTwo = assignedBuildingNames.slice(0, 2).join(", ");
    const remaining = assignedBuildingNames.length - 2;
    return remaining > 0 ? `${firstTwo} + ${remaining} more` : firstTwo;
  };

  return (
    <Container className="py-2">
      <Row className="mb-3 align-items-center">
        <Col>
          <h3 className="mb-0">Tenants — {buildingDisplay()}</h3>
          <div className="text-muted small">
            {assignedBuildingIds.length ? `Managing ${buildingDisplay()}` : "No building assigned"}
          </div>
        </Col>
        <Col className="text-end">
          <div className="d-flex justify-content-end gap-2 align-items-center">
            <div className="position-relative me-2" style={{ width: 280 }}>
              <Search size={16} className="position-absolute text-muted" style={{ top: "50%", left: 10, transform: "translateY(-50%)" }} />
              <Form.Control
                placeholder="Search by name, ID or phone"
                value={searchTerm}
                ref={searchRef}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: 36, borderRadius: 10 }}
              /></div>
                          <Button
                            variant="outline-secondary"
                            onClick={() => {
                              setSearchTerm("");
                              if (searchRef.current) searchRef.current.value = "";
                            }}
                          >
                            Clear
                          </Button>
            
         </div>
        </Col>
      </Row>

      <Card className="mb-3">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <strong>Tenants</strong>
              <div className="small text-muted">{shownCount} / {totalCount} shown</div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <ButtonGroup>
                <ToggleButton
                  id="status-all"
                  type="radio"
                  variant={statusFilter === "all" ? "secondary" : "outline-secondary"}
                  name="status"
                  value="all"
                  checked={statusFilter === "all"}
                  onChange={() => setStatusFilter("all")}
                >
                  All
                </ToggleButton>
                <ToggleButton
                  id="status-active"
                  type="radio"
                  variant={statusFilter === "active" ? "secondary" : "outline-secondary"}
                  name="status"
                  value="active"
                  checked={statusFilter === "active"}
                  onChange={() => setStatusFilter("active")}
                >
                  Active
                </ToggleButton>
                <ToggleButton
                  id="status-left"
                  type="radio"
                  variant={statusFilter === "left" ? "secondary" : "outline-secondary"}
                  name="status"
                  value="left"
                  checked={statusFilter === "left"}
                  onChange={() => setStatusFilter("left")}
                >
                  Left
                </ToggleButton>
              </ButtonGroup>
                          <Button variant="secondary" className="me-1" onClick={openQuickAdd}>Quick Add</Button>
            <Button variant="primary" onClick={() => openAdd()} disabled={!assignedBuildingIds.length || loadingRooms}><UserRoundPlus/> Tenant</Button>
 
            </div>
          </div>

          {loadingTenants ? (
            <div className="text-center py-4"><Spinner /></div>
          ) : tenants.length === 0 ? (
            <div className="text-center text-muted py-4">No tenants found</div>
          ) : filteredTenants.length === 0 ? (
            <div className="text-center text-muted py-4">No tenants match your filter</div>
          ) : (
            <Row xs={1} sm={1} md={2} lg={3} className="g-3">
              {filteredTenants.map((t) => (
                <Col key={t._id}>
                  <TenantCard t={t} />
                </Col>
              ))}
            </Row>
          )}
        </Card.Body>
      </Card>

      {/* Quick Add modal */}
      <Modal show={showQuickAdd} onHide={() => setShowQuickAdd(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Quick Add Tenant — Select Building & Room</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Building</Form.Label>
              <Form.Select value={selectedBuilding} onChange={(e) => setSelectedBuilding(e.target.value)}>
                <option value="">-- Select building --</option>
                {assignedBuildingIds.map((bid) => {
                  const bName = assignedBuildingNames[assignedBuildingIds.indexOf(bid)];
                  return <option key={bid} value={bid}>{bName}</option>;
                })}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Available Rooms</Form.Label>
              {loadingRooms ? (
                <div className="text-center py-2"><Spinner animation="border" size="sm" /></div>
              ) : roomsForBuilding.length === 0 ? (
                <div className="text-muted">No available rooms in selected building</div>
              ) : (
                <Form.Select value={selectedRoomId} onChange={(e) => setSelectedRoomId(e.target.value)}>
                  <option value="">-- Select room --</option>
                  {roomsForBuilding.map((r) => (
                    <option key={r._id} value={r._id}>{r.number}{r.floor ? ` - ${r.floor}` : ""}</option>
                  ))}
                </Form.Select>
              )}
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQuickAdd(false)}>Cancel</Button>
          <Button variant="primary" onClick={confirmQuickAdd} disabled={!selectedRoomId}>Proceed</Button>
        </Modal.Footer>
      </Modal>

      {/* Add/Edit Tenant Modal */}
      {showFormModal && (
        <TenantForm
          tenant={editingTenant}
          room={rooms.find((r) => r._id === selectedRoomId) || null}
          buildings={rooms
            .map((r) => r.building)
            .filter((v, i, a) => a.findIndex(b => b._id === v._id) === i)}
          onClose={closeFormModal}
          onRefresh={onTenantFormSuccess}
        />
      )}

      {/* Tenant View (read-only) */}
      {showTenantView && viewTenant && (
        <TenantView
          tenant={viewTenant}
          onClose={() => { setShowTenantView(false); setViewTenant(null); }}
        />
      )}


      {/* Mark Leave Modal */}
      <Modal show={showLeaveModal} onHide={() => setShowLeaveModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Mark Leave</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Leave Date</Form.Label>
            <Form.Control type="date" value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLeaveModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={confirmLeave}>Confirm</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
