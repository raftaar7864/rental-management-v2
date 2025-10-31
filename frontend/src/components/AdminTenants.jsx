// src/pages/AdminTenants.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  getAllTenants,
  deleteTenant,
  markLeaveTenant,
} from "../services/TenantService";
import { getAllBuildings } from "../services/BuildingService";
import { getRoomsByBuilding } from "../services/RoomService";
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
import { Phone, House, User, Eye, Edit, Trash2, LogOut, UserRoundPlus, Search } from "lucide-react";

import TenantView from "./TenantView";
import TenantForm from "./TenantForm";
import IconDropdown from "./IconDropdown";

/* TenantCard unchanged except copied in file for completeness */
const TenantCard = ({ tenant, onView, onEdit, onDelete, onMarkLeave }) => {
  const {
    _id,
    fullName = "-",
    tenantId = "-",
    phone = "-",
    moveInDate,
    moveOutDate,
    room,
  } = tenant || {};

  const buildingName = room?.building?.name || "-";
  const roomNumber = room?.number || "-";
  const status = moveOutDate ? "Left" : "Active";
  const moveIn = moveInDate ? new Date(moveInDate).toLocaleDateString() : "-";

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(tenantId || "");
      toast.success("Tenant ID copied");
    } catch {
      toast.error("Unable to copy");
    }
  };

  const rentValue = tenant?.rentAmount ?? tenant?.rent ?? tenant?.monthlyRent;
  const rentDisplay =
    rentValue !== undefined && rentValue !== null
      ? `₹${Number(rentValue).toFixed(2)}`
      : "-";

  return (
    <Card
      className={`h-100 shadow-sm border-0 ${
        moveOutDate ? "tenant-left" : "tenant-active"
      }`}
      style={{
        borderRadius: 12,
        cursor: "pointer",
        transition: "transform .12s ease, box-shadow .12s ease",
        backgroundColor: moveOutDate ? "#fdecea" : "#e5f8ddff",
        border: moveOutDate ? "1px solid #f5c2c7" : "1px solid #eaeaeaff",
        color: moveOutDate ? "#6c757d" : "#212529",
      }}
      onClick={() => onView(tenant)}
      role="button"
      aria-label={`Open tenant ${fullName} details`}
    >
      <Card.Body className="d-flex flex-column justify-content-between">
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
                { icon: Eye, title: "View", label: "View", handler: () => onView(tenant) },
                { icon: Edit, title: "Edit", label: "Edit", handler: () => onEdit(tenant) },
                {
                  icon: Trash2,
                  title: "Delete",
                  label: "Delete",
                  color: "danger",
                  handler: () => {
                    if (window.confirm("Delete tenant? This will remove record.")) onDelete(tenant);
                  },
                },
                !moveOutDate && {
                  icon: LogOut,
                  title: "Mark Leave",
                  label: "Mark Leave",
                  handler: () => onMarkLeave(_id),
                },
              ].filter(Boolean)}
              showText
              hoverToOpen={false}
            />
          </div>
        </div>

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
              onClick={(e) => {
                e.stopPropagation();
                copyId();
              }}
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
              Rent: <span className="fw-medium ms-1">{rentDisplay}</span>
            </Badge>
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="small text-muted">
            {moveOutDate ? "Move out" : "Move in"}
          </div>
          <div className="fw-medium">
            {moveOutDate ? new Date(moveOutDate).toLocaleDateString() : moveIn}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

const AdminTenants = () => {
  const [tenants, setTenants] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [roomsForBuilding, setRoomsForBuilding] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingBuildings, setLoadingBuildings] = useState(false);

  const [selectedBuildingForQuickAdd, setSelectedBuildingForQuickAdd] = useState("");
  const [selectedRoomForQuickAdd, setSelectedRoomForQuickAdd] = useState(null);

  const [tenantForForm, setTenantForForm] = useState(null);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [viewTenant, setViewTenant] = useState(null);
  const [showTenantView, setShowTenantView] = useState(false);

  const [showQuickAddModal, setShowQuickAddModal] = useState(false);

  const [markLeaveId, setMarkLeaveId] = useState(null);
  const [leaveDate, setLeaveDate] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");

  const searchRef = useRef(null);

  useEffect(() => {
    loadTenants();
    loadBuildings();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const res = await getAllTenants();
      setTenants(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load tenants");
    } finally {
      setLoading(false);
    }
  };

  const loadBuildings = async () => {
    try {
      setLoadingBuildings(true);
      const res = await getAllBuildings();
      const bs = res.data || [];
      setBuildings(bs);
      if (bs.length > 0 && !selectedBuildingForQuickAdd) setSelectedBuildingForQuickAdd(bs[0]._id);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load buildings");
    } finally {
      setLoadingBuildings(false);
    }
  };

  useEffect(() => {
    const loadRooms = async () => {
      if (!selectedBuildingForQuickAdd) {
        setRoomsForBuilding([]);
        setSelectedRoomForQuickAdd(null);
        return;
      }
      try {
        setLoadingRooms(true);
        const res = await getRoomsByBuilding(selectedBuildingForQuickAdd);
        const available = (res.data || []).filter((r) => !r.isBooked);
        setRoomsForBuilding(available);
        setSelectedRoomForQuickAdd(available.length ? available[0]._id : null);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load rooms for building");
      } finally {
        setLoadingRooms(false);
      }
    };
    loadRooms();
  }, [selectedBuildingForQuickAdd]);

  const handleDelete = async (t) => {
    try {
      await deleteTenant(t._id);
      toast.success("Tenant deleted");
      await loadTenants();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to delete tenant");
    }
  };

  const startMarkLeave = (tenantId) => {
    setMarkLeaveId(tenantId);
    setLeaveDate(new Date().toISOString().split("T")[0]);
  };
  const confirmMarkLeave = async () => {
    if (!markLeaveId || !leaveDate) return toast.error("Please pick leave date");
    try {
      await markLeaveTenant(markLeaveId, leaveDate);
      toast.success("Tenant marked as left");
      setMarkLeaveId(null);
      setLeaveDate("");
      await loadTenants();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to mark leave");
    }
  };

  const openQuickAdd = () => {
    setSelectedBuildingForQuickAdd(buildings.length ? buildings[0]._id : "");
    setShowQuickAddModal(true);
  };
  const openAddTenantForSelectedRoom = () => {
    if (!selectedRoomForQuickAdd) return toast.error("Select a room first");
    const room = roomsForBuilding.find((r) => r._id === selectedRoomForQuickAdd);
    setTenantForForm({ room });
    setShowQuickAddModal(false);
    setShowTenantForm(true);
  };

  const openEditTenant = (tenant) => {
    setTenantForForm(tenant);
    setShowTenantForm(true);
  };

  const openAddTenant = () => {
    setTenantForForm(null);
    setShowTenantForm(true);
  };

  const onTenantFormSuccess = async () => {
    setShowTenantForm(false);
    setTenantForForm(null);
    await loadTenants();
  };

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

  const handleViewTenant = (tenant) => {
    setViewTenant(tenant);
    setShowTenantView(true);
  };

  // ---------- EXPORT TO EXCEL (exceljs via dynamic import) ----------
  const exportToExcel = async (rows = []) => {
    if (!rows || !rows.length) {
      toast.info("No tenants to export");
      return;
    }

    let ExcelJS;
    try {
      // try browser bundle first - more Vite friendly
      const mod = await import("exceljs/dist/exceljs.min.js").catch(() => null);
      if (mod) ExcelJS = mod && mod.default ? mod.default : mod;
      else {
        const mod2 = await import("exceljs");
        ExcelJS = mod2 && mod2.default ? mod2.default : mod2;
      }
    } catch (err) {
      console.error("Failed to load exceljs:", err);
      toast.error("Export failed: exceljs not available");
      return;
    }

    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = "Rental Manager";
      wb.created = new Date();
      const ws = wb.addWorksheet("Tenants");

      ws.columns = [
        { header: "#", key: "idx", width: 6 },
        { header: "Name", key: "name", width: 30 },
        { header: "Tenant ID", key: "tenantId", width: 16 },
        { header: "Phone", key: "phone", width: 14 },
        { header: "Building", key: "building", width: 20 },
        { header: "Room", key: "room", width: 12 },
        { header: "Status", key: "status", width: 10 },
        { header: "MoveIn", key: "moveIn", width: 16 },
        { header: "MoveOut", key: "moveOut", width: 16 },
        { header: "Rent", key: "rent", width: 12 },
      ];

      rows.forEach((t, i) => {
        ws.addRow({
          idx: i + 1,
          name: t.fullName || "-",
          tenantId: t.tenantId || "-",
          phone: t.phone || "-",
          building: t.room?.building?.name || "-",
          room: t.room?.number || t.roomId || "-",
          status: t.moveOutDate ? "Left" : "Active",
          moveIn: t.moveInDate ? new Date(t.moveInDate).toLocaleDateString() : "",
          moveOut: t.moveOutDate ? new Date(t.moveOutDate).toLocaleDateString() : "",
          rent: t.rentAmount ?? t.rent ?? t.monthlyRent ?? "",
        });
      });

      ws.getRow(1).font = { bold: true };
      ws.autoFilter = { from: "A1", to: "J1" };

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tenants_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Exported tenants to Excel");
    } catch (err) {
      console.error("Excel export error:", err);
      toast.error("Failed to export Excel");
    }
  };
  // -------------------------------------------------------------------


  return (
    <Container className="py-2">
      {/* Header */}
      <Row className="mb-3 align-items-center">
        <Col>
          <div>
            <h3 className="mb-0">Tenant Management</h3>
            <div className="text-muted small">Click a card to view full tenant details</div>
          </div>
        </Col>

        <Col className="text-end">
          <div className="d-flex justify-content-end gap-2 align-items-center">
            {/* Search */}
            <div className="position-relative me-2" style={{ width: 280 }}>
              <Search
                size={16}
                className="position-absolute text-muted"
                style={{ top: "50%", left: 10, transform: "translateY(-50%)" }}
              />
              <Form.Control
                placeholder="Search by name, ID or phone"
                value={searchTerm}
                ref={searchRef}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search tenants"
                style={{ paddingLeft: 36, borderRadius: 10 }}
              />
            </div>
                        <Button variant="outline-secondary" onClick={() => { setSearchTerm(""); setDebouncedSearch(""); }}>
                          Clear
                        </Button>

            {/* Quick Add / Export / Add */}
               <Button variant="outline-primary" className="me-1" onClick={() => exportToExcel(filteredTenants)}>
              📥 Export
            </Button>
          </div>
        </Col>
      </Row>

      {/* Controls & summary card */}
      <Card className="mb-3">
        <Card.Body>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            <div>
              <strong>Tenants</strong>
              <div className="small text-muted">{shownCount} / {totalCount} shown</div>
            </div>

            <div className="d-flex align-items-center gap-2">
              {/* Status toggles */}
              <ButtonGroup size="sm" className="me-2" aria-label="Filter tenants by status">
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

              {/* View toggle */}
            <Button variant="secondary" className="me-1" onClick={openQuickAdd} disabled={!buildings.length}>
              Quick Add
            </Button>

            <Button variant="primary" onClick={openAddTenant}>
              <UserRoundPlus size ="16"/> Tenant
            </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Content */}
      <Card className="mb-3">
        <Card.Body>
          {loading ? (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          ) : tenants.length === 0 ? (
            <p className="text-muted">No tenants found. Add one using the 'Add Tenant' button.</p>
          ) : filteredTenants.length === 0 ? (
            <p className="text-muted">No tenants match your filters.</p>
          ) : viewMode === "grid" ? (
            <Row xs={1} sm={1} md={2} lg={3} className="g-3">
              {filteredTenants.map((t) => (
                <Col key={t._id}>
                  <TenantCard
                    tenant={t}
                    viewMode="grid"
                    onView={handleViewTenant}
                    onEdit={openEditTenant}
                    onDelete={handleDelete}
                    onMarkLeave={startMarkLeave}
                  />
                </Col>
              ))}
            </Row>
          ) : (
            <div className="d-flex flex-column gap-3">
              {filteredTenants.map((t) => (
                <div key={t._id}>
                  <TenantCard
                    tenant={t}
                    viewMode="list"
                    onView={handleViewTenant}
                    onEdit={openEditTenant}
                    onDelete={handleDelete}
                    onMarkLeave={startMarkLeave}
                  />
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>
      {/* Tenant Form modal */}
      {showTenantForm && (
        <TenantForm
          tenant={tenantForForm && tenantForForm._id ? tenantForForm : null}
          room={tenantForForm && tenantForForm.room ? tenantForForm.room : undefined}
          buildings={buildings}
          onClose={() => { setShowTenantForm(false); setTenantForForm(null); }}
          onRefresh={onTenantFormSuccess}
        />
      )}

      {/* Tenant View */}
      {showTenantView && viewTenant && (
        <TenantView
          tenant={viewTenant}
          onClose={() => { setShowTenantView(false); setViewTenant(null); }}
        />
      )}
      {/* Quick Add Modal */}
      <Modal show={showQuickAddModal} onHide={() => setShowQuickAddModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Quick Add Tenant — Select Building & Room</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Building</Form.Label>
              <Form.Select
                value={selectedBuildingForQuickAdd}
                onChange={(e) => setSelectedBuildingForQuickAdd(e.target.value)}
                disabled={loadingBuildings}
              >
                <option value="">-- Select building --</option>
                {buildings.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}{b.address ? ` — ${b.address}` : ""}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Available Rooms</Form.Label>
              {loadingRooms ? (
                <div className="text-center py-2"><Spinner animation="border" size="sm" /></div>
              ) : roomsForBuilding.length === 0 ? (
                <div className="text-muted">No available rooms in selected building</div>
              ) : (
                <Form.Select value={selectedRoomForQuickAdd || ""} onChange={(e) => setSelectedRoomForQuickAdd(e.target.value)}>
                  <option value="">-- Select room --</option>
                  {roomsForBuilding.map((r) => <option key={r._id} value={r._id}>{r.number}</option>)}
                </Form.Select>
              )}
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQuickAddModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={openAddTenantForSelectedRoom} disabled={!selectedRoomForQuickAdd}>
            Quick Add to Room
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Mark Leave Modal */}
      <Modal show={!!markLeaveId} onHide={() => setMarkLeaveId(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Mark Tenant Leave</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Leave Date</Form.Label>
            <Form.Control type="date" value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setMarkLeaveId(null)}>Cancel</Button>
          <Button variant="warning" onClick={confirmMarkLeave}>Confirm</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );

};

export default AdminTenants;
