// frontend/src/components/ManagerRooms.jsx
// replace your existing import block with this (or update it accordingly)
import React, { useEffect, useState, useContext, useMemo, useRef } from "react";
import { Row, Col, Card, Button, Spinner, Badge, Container, InputGroup, Form, ButtonGroup, ToggleButton, Modal} from "react-bootstrap";
import { getRoomsForManager } from "../services/RoomService";
import { AuthContext } from "../context/AuthContext";
import TenantForm from "./TenantForm";
import TenantView from "./TenantView";
import IconDropdown from "./IconDropdown";
import { toast } from "react-toastify";
import { House, User, Phone, PlusCircle, Eye, Edit, Search, LogOut, RefreshCw } from "lucide-react";
import { markLeaveTenant } from "../services/ManagerTenantService";


/**
 * ManagerRooms
 * - Header card like AdminTenants: title, shown/total count, status toggles
 * - Grid of tenant/room cards (click card to view/add)
 * - Search (debounced)
 * - Tenant modals (Add/Edit/View)
 *
 * Option A pastel card theme applied (soft backgrounds + subtle borders)
 */

const ManagerRooms = () => {
  const { user } = useContext(AuthContext);
  const isManager = String(user?.role || "").toLowerCase() === "manager";
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | booked | available
  const [selectedRoom, setSelectedRoom] = useState(null); // { ...room, mode: 'add'|'view'|'edit', tenant }
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
// Replace your existing mark-leave state + functions with this block

// state for mark-leave
const [showMarkLeaveModal, setShowMarkLeaveModal] = useState(false);
const [markLeaveTarget, setMarkLeaveTarget] = useState(null); // <-- avoid name collision
const [markLeaveDate, setMarkLeaveDate] = useState("");

// inside ManagerRooms.jsx

const openMarkLeave = (room) => {
  const tenant = getActiveTenant(room);
  if (!tenant) {
    toast.info("No active tenant to mark leave.", { position: "top-right" });
    return;
  }
  setMarkLeaveTarget(tenant);
  setMarkLeaveDate(new Date().toISOString().split("T")[0]);
  setShowMarkLeaveModal(true);
};

const confirmMarkLeave = async () => {
  if (!markLeaveTarget || !markLeaveDate) {
    toast.warn("Please select a leave date", { position: "top-right" });
    return;
  }

  try {
    await markLeaveTenant(markLeaveTarget._id, markLeaveDate);
    await loadRooms();
    setShowMarkLeaveModal(false);
    setMarkLeaveTarget(null);
    setMarkLeaveDate("");
    toast.success("Tenant marked as left successfully!", { position: "top-right" });
  } catch (err) {
    console.error("confirmMarkLeave:", err);
    toast.error("Failed to mark leave. Try again.", { position: "top-right" });
  }
};

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch((search || "").trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const res = await getRoomsForManager();
      setRooms(res.data || []);
    } catch (err) {
      console.error("loadRooms:", err);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const normalizeTenants = (room) => {
    if (!room) return [];
    if (Array.isArray(room.tenants) && room.tenants.length) return room.tenants;
    if (Array.isArray(room.tenant) && room.tenant.length) return room.tenant;
    return [];
  };

  const getActiveTenant = (room) => normalizeTenants(room).find((t) => !t.moveOutDate) || null;

  const copyId = async (id) => {
    try {
      await navigator.clipboard.writeText(id || "");
      alert("Tenant ID copied");
    } catch {
      alert("Unable to copy");
    }
  };


// Replace your formattedRent helper with this
const formattedRent = (r, t) => {
  const rentVal = Number(
    t?.rentAmount ??
    t?.rent ??
    r?.rent ??
    r?.rentAmount ??
    r?.monthlyRent ??
    0
  );
  return rentVal ? `₹${rentVal.toFixed(2)}` : "-";
};


  // Option A pastel theme helper
  const getCardStyle = (r, t) => {
    // left tenants (tenant.moveOutDate exists)
    const isLeft = !!t?.moveOutDate;
    // booked (occupied now)
    const isBooked = !!r.isBooked;
    if (isLeft) {
      return {
        backgroundColor: "#fdecea", // soft pink
        border: "1px solid #f5c2c7",
        color: "#6c757d",
      };
    }
    if (isBooked) {
      return {
        backgroundColor: "#fff4e5", // soft warm (booked)
        border: "1px solid #ffd699",
        color: "#995c00",
      };
    }
    // available
    return {
      backgroundColor: "#e8f8ef", // soft green
      border: "1px solid #b4e2c1",
      color: "#146c43",
    };
  };

  // search-only filtered set (for badge counts, if needed)
  const searchFilteredRooms = useMemo(() => {
    if (!debouncedSearch) return rooms.slice();
    const q = debouncedSearch;
    return (rooms || []).filter((r) => {
      const roomNumber = (r.number || "").toString().toLowerCase();
      const buildingName = (r.building?.name || "").toLowerCase();
      const t = getActiveTenant(r);
      const tenantName = (t?.fullName || "").toLowerCase();
      const tenantId = (t?.tenantId || t?._id || "").toString().toLowerCase();
      return (
        roomNumber.includes(q) ||
        buildingName.includes(q) ||
        tenantName.includes(q) ||
        tenantId.includes(q)
      );
    });
  }, [rooms, debouncedSearch]);

  // final filtered set (applies statusFilter + search)
  const filteredRooms = useMemo(() => {
    let tmp = (rooms || []).slice();

    if (statusFilter !== "all") {
      tmp = tmp.filter((r) => (statusFilter === "booked" ? !!r.isBooked : !r.isBooked));
    }

    if (debouncedSearch) {
      const q = debouncedSearch;
      tmp = tmp.filter((r) => {
        const roomNumber = (r.number || "").toString().toLowerCase();
        const buildingName = (r.building?.name || "").toLowerCase();
        const t = getActiveTenant(r);
        const tenantName = (t?.fullName || "").toLowerCase();
        const tenantId = (t?.tenantId || t?._id || "").toString().toLowerCase();
        return (
          roomNumber.includes(q) ||
          buildingName.includes(q) ||
          tenantName.includes(q) ||
          tenantId.includes(q)
        );
      });
    }

    return tmp;
  }, [rooms, statusFilter, debouncedSearch]);

  const shownCount = filteredRooms.length;
  const totalCount = rooms.length;

  // actions to open modals
  const openAdd = (room) => setSelectedRoom({ ...room, mode: "add" });
  const openView = (room) => {
    const tenant = getActiveTenant(room);
    setSelectedRoom({ ...room, mode: "view", tenant });
  };
  const openEdit = (room) => {
    const tenant = getActiveTenant(room);
    if (!tenant) {
      toast.info("No active tenant to edit.", { position: "top-right" });
      return;
    }
    setSelectedRoom({ room: { ...(room || {}) }, mode: "edit", tenant: { ...(tenant || {}) } });
  };

  
  return (
    <Container className="py-2">
      <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap">
        <div>
          <h2 className="mb-1">Manager Dashboard</h2>
          <div className="text-muted small">Manage rooms & tenants</div>
        </div>

        <div className="d-flex gap-2 align-items-center mt-2">
          <InputGroup style={{ width: 360 }}>
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
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              ref={searchRef}
            />
            <Button
              variant="outline-secondary"
              onClick={() => {
                setSearch("");
                if (searchRef.current) searchRef.current.value = "";
              }}
            >
              Clear
            </Button>
          </InputGroup>
        </div>
      </div>

      {/* Header card similar to AdminTenants */}
      <Card className="mb-3">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <strong>Rooms</strong>
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
                  id="status-booked"
                  type="radio"
                  variant={statusFilter === "booked" ? "secondary" : "outline-secondary"}
                  name="status"
                  value="booked"
                  checked={statusFilter === "booked"}
                  onChange={() => setStatusFilter("booked")}
                >
                  Booked
                </ToggleButton>
                <ToggleButton
                  id="status-available"
                  type="radio"
                  variant={statusFilter === "available" ? "secondary" : "outline-secondary"}
                  name="status"
                  value="available"
                  checked={statusFilter === "available"}
                  onChange={() => setStatusFilter("available")}
                >
                  Available
                </ToggleButton>
                <Button variant="outline-secondary" className="ms-2" onClick={loadRooms}>
                <RefreshCw size={16} className="me-1" />
              </Button>
              </ButtonGroup>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-4"><Spinner /></div>
          ) : rooms.length === 0 ? (
            <div className="text-center text-muted py-4">No rooms found</div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center text-muted py-4">No rooms match your filter</div>
          ) : (
            <Row xs={1} sm={1} md={2} lg={3} className="g-3">
              {filteredRooms.map((r) => {
                const t = getActiveTenant(r);
                const moveIn = t?.moveInDate ? new Date(t.moveInDate).toLocaleDateString() : "-";
                const moveOut = t?.moveOutDate ? new Date(t.moveOutDate).toLocaleDateString() : null;
                const status = t && t.moveOutDate ? "Left" : r.isBooked ? "Booked" : "Available";
                const pastelStyle = getCardStyle(r, t);

                return (
                  <Col key={r._id || r.id}>
                    <Card
                      className={`h-100 shadow-sm border-0 ${moveOut ? "tenant-left" : "tenant-active"}`}
                      style={{
                        borderRadius: 12,
                        cursor: "pointer",
                        transition: "transform .12s ease, box-shadow .12s ease",
                        ...pastelStyle,
                        // slight hover lift via boxShadow on hover - CSS inline can't do :hover; apply transform onMouseEnter/onMouseLeave
                      }}
                      onClick={() => {
                        if (t) openView(r);
                        else openAdd(r);
                      }}
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
                        {/* Top: Location & actions */}
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                            <House size={18} className="text-muted" />
                            <div>
                              <div className="small text-muted">Location</div>
                              <div className="fw-medium text-truncate">
                                {r.building?.name || (r.building || "-")} - {r.number || r.roomNumber || "-"}
                              </div>
                            </div>
                          </div>

                          <div style={{ minWidth: 80 }} className="text-end">
                            <Badge
                              bg={status === "Booked" ? "danger" : status === "Left" ? "secondary" : "success"}
                              className="py-1 px-2"
                              style={{ borderRadius: 999 }}
                            >
                              {status}
                            </Badge>

                
                            <IconDropdown
                              actions={[
                                {
                                  icon: Eye,
                                  title: "View",
                                  label: "View",
                                  handler: (e) => {
                                    e?.stopPropagation();
                                    openView(r);
                                  },
                                },

                                // MARK LEAVE — only when there's an active tenant
                                t && {
                                  icon: LogOut,
                                  title: "Mark Leave",
                                  label: "Mark Leave",
                                  handler: (e) => {
                                    e?.stopPropagation();
                                    openMarkLeave(r);
                                  },
                                  color: "warning",
                                },
                              ].filter(Boolean)}
                              showText
                              hoverToOpen={false}
                            />

                            </div>
                          </div>
                        

                        {/* Middle: Tenant Name, ID badge, Phone, Rent */}
                        <div className="mb-2">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                              <User size={16} className="text-muted" />
                              <div className="fs-6 fw-bold text-truncate">{t?.fullName || "—"}</div>
                            </div>

                            <Badge
                              bg="light"
                              text="dark"
                              className="border"
                              style={{ cursor: "pointer" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                copyId(t?.tenantId || t?._id || "");
                              }}
                              title="Click to copy ID"
                            >
                              ID: <span className="fw-medium ms-1">{t?.tenantId || t?._id || "-"}</span>
                            </Badge>
                          </div>

                          <div className="d-flex align-items-center justify-content-between mt-2">
                            <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                              <Phone size={14} className="text-muted" />
                              <div className="fw-medium text-truncate">{t?.phone || "-"}</div>
                            </div>
                            <Badge bg="dark" text="light" className="border" style={{ cursor: "pointer" }}>
                              Rent: <span className="fw-medium ms-1">{formattedRent(r, t)}</span>
                            </Badge>
                          </div>
                        </div>

                        {/* Footer: Move in / Move out */}
                        <div className="d-flex justify-content-between align-items-center mt-3">
                          <div className="small text-muted">{moveOut ? "Move out" : "Move in"}</div>
                          <div className="fw-medium">{moveOut ? moveOut : moveIn}</div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </Card.Body>
      </Card>

      {/* Modals */}
      {selectedRoom && (selectedRoom.mode === "add" || selectedRoom.mode === "edit") && (
        <TenantForm
          room={selectedRoom}
          tenant={selectedRoom.mode === "edit" ? selectedRoom.tenant : null}
          onClose={() => {
            setSelectedRoom(null);
            loadRooms();
          }}
          onRefresh={() => {
            loadRooms();
            setSelectedRoom(null);
          }}
        />
      )}

      {selectedRoom && selectedRoom.mode === "view" && selectedRoom.tenant && (
        <TenantView tenant={selectedRoom.tenant} onClose={() => setSelectedRoom(null)} />
      )}

{/* Mark Leave Modal */}
<Modal show={showMarkLeaveModal} onHide={() => setShowMarkLeaveModal(false)} centered>
  <Modal.Header closeButton>
    <Modal.Title>Mark Leave</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <Form.Group>
      <Form.Label>Leave Date</Form.Label>
      <Form.Control
        type="date"
        value={markLeaveDate}
        onChange={(e) => setMarkLeaveDate(e.target.value)}
      />
    </Form.Group>
    <div className="mt-3">
      <div><strong>Tenant:</strong> {markLeaveTarget?.fullName || "-"}</div>
      <div className="small text-muted">ID: {markLeaveTarget?.tenantId || markLeaveTarget?._id || "-"}</div>
    </div>
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setShowMarkLeaveModal(false)}>Cancel</Button>
    <Button variant="primary" onClick={confirmMarkLeave}>Confirm</Button>
  </Modal.Footer>
</Modal>

    </Container>
  );
};

export default ManagerRooms;
