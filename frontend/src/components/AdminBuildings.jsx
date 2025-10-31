// src/pages/AdminBuildings.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Container,
  Card,
  Row,
  Col,
  Button,
  InputGroup,
  Form,
  Modal,
  Spinner,
  Badge,
} from "react-bootstrap";
import {
  getBuildings,
  createBuilding,
  updateBuilding,
} from "../services/BuildingService";
import { getRoomsByBuilding } from "../services/RoomService";
import { House, Search, RefreshCw, Edit, PlusCircle } from "lucide-react";
import "react-toastify/dist/ReactToastify.css";
import { toast } from "react-toastify";

/** 🎨 Color palette for building cards */
const CARD_COLORS = [
  "linear-gradient(135deg, #c3e0fb, #a1c4fd)", // light blue
  "linear-gradient(135deg, #fbc2eb, #a6c1ee)", // pinkish
  "linear-gradient(135deg, #fddb92, #d1fdff)", // yellow-blue
  "linear-gradient(135deg, #a1ffce, #faffd1)", // mint
  "linear-gradient(135deg, #f6d365, #fda085)", // orange
  "linear-gradient(135deg, #d4fc79, #96e6a1)", // lime
  "linear-gradient(135deg, #84fab0, #8fd3f4)", // green-blue
];

/** Individual building card component */
const BuildingCard = ({ b, onEdit, index }) => {
  const bg = CARD_COLORS[index % CARD_COLORS.length];

  return (
    <Card
      className="h-100 shadow-sm border-0 text-dark"
      style={{
        background: bg,
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.02)";
        e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
      }}
    >
      <Card.Body className="d-flex flex-column justify-content-between">
        <div>
          <div className="d-flex align-items-start gap-3">
            <div style={{ minWidth: 36 }}>
              <House size={22} className="text-primary" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="fw-semibold text-truncate fs-5">{b.name}</div>
              <div
                className="small text-muted text-truncate"
                style={{ maxWidth: 360 }}
              >
                {b.address || "No address provided"}
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center mt-3">
          <div>
            <Badge bg="light" text="dark" className="border">
              Rooms: <span className="fw-semibold ms-1">{b.roomCount ?? 0}</span>
            </Badge>
          </div>

          <Button size="sm" variant="outline-dark" onClick={() => onEdit(b)}>
            <Edit size={14} className="me-1" /> Edit
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

const AdminBuildings = () => {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // modal state
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", address: "" });
  const [editingId, setEditingId] = useState(null);

  // search
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchRef = useRef(null);

  // fetch buildings + room counts
  const fetchBuildings = async () => {
    try {
      setLoading(true);
      const res = await getBuildings();
      const buildingsData = Array.isArray(res.data) ? res.data : [];

      // fetch room counts in parallel
      setLoadingRooms(true);
      const buildingsWithRooms = await Promise.all(
        buildingsData.map(async (b) => {
          try {
            const roomsRes = await getRoomsByBuilding(b._id);
            const count = Array.isArray(roomsRes.data)
              ? roomsRes.data.length
              : 0;
            return { ...b, roomCount: count };
          } catch {
            return { ...b, roomCount: 0 };
          }
        })
      );
      setBuildings(buildingsWithRooms);
    } catch (err) {
      console.error("Error fetching buildings:", err);
      toast.error("Failed to load buildings");
      setBuildings([]);
    } finally {
      setLoading(false);
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchBuildings();
  }, []);

  // debounce search
  useEffect(() => {
    const term = (search || "").trim().toLowerCase();
    const t = setTimeout(() => setDebouncedSearch(term), 300);
    return () => clearTimeout(t);
  }, [search]);

  const applyImmediateSearch = () =>
    setDebouncedSearch((search || "").trim().toLowerCase());

  const filtered = useMemo(() => {
    if (!debouncedSearch) return buildings.slice();
    const q = debouncedSearch;
    return (buildings || []).filter((b) => {
      const name = (b.name || "").toLowerCase();
      const address = (b.address || "").toLowerCase();
      return name.includes(q) || address.includes(q);
    });
  }, [buildings, debouncedSearch]);

  const openAddModal = () => {
    setForm({ name: "", address: "" });
    setEditingId(null);
    setShowModal(true);
  };

  const openEditModal = (b) => {
    setForm({ name: b.name || "", address: b.address || "" });
    setEditingId(b._id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm({ name: "", address: "" });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = (form.name || "").trim();
    const address = (form.address || "").trim();
    if (!name) return toast.warn("Please enter a building name");

    try {
      setSaving(true);
      if (editingId) {
        await updateBuilding(editingId, { name, address });
        toast.success("Building updated");
      } else {
        await createBuilding({ name, address });
        toast.success("Building added");
      }
      closeModal();
      await fetchBuildings();
    } catch (err) {
      console.error("Error saving building:", err);
      toast.error(err?.response?.data?.message || "Failed to save building");
    } finally {
      setSaving(false);
    }
  };

  const refresh = () => fetchBuildings();

  return (
    <Container className="py-2">
      {/* Top header */}
      <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap">
        <div>
          <h3 className="mb-1">Manage Buildings</h3>
          <div className="text-muted small">
            Create, edit, and manage your buildings
          </div>
        </div>

        <div className="d-flex gap-2 align-items-center mt-2">
          <InputGroup style={{ width: 360 }}>
            <div
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 2,
              }}
            >
              <Search size={16} className="text-muted" />
            </div>

            <Form.Control
              style={{ paddingLeft: 40, borderRadius: 10 }}
              placeholder="Search by name or address"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyImmediateSearch();
                }
              }}
              ref={searchRef}
            />
            <Button
              variant="outline-secondary"
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
                if (searchRef.current) searchRef.current.value = "";
              }}
            >
              Clear
            </Button>
          </InputGroup>
        </div>
      </div>

      {/* Header card */}
      <Card className="mb-3">
        <Card.Body className="d-flex justify-content-between align-items-center">
          <div>
            <strong>Buildings</strong>
            <div className="small text-muted">
              {filtered.length} / {buildings.length} shown
            </div></div>
            <div style={{ position: "absolute", right: 12}}>
          <Button variant="primary" onClick={openAddModal} className="ms-2">
            <PlusCircle size={14} className="me-1" /> Add Building
          </Button>

          <Button variant="outline-secondary" className="ms-2" onClick={refresh}>
            <RefreshCw size={16} className="me-1" />Refresh
          </Button>
          </div>
          <div className="small text-muted">
            {loading || loadingRooms ? <Spinner animation="border" size="sm" /> : null}
          </div>
        </Card.Body>
      </Card>

      {/* Building cards */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted py-4">No buildings found.</div>
      ) : (
        <Row xs={1} sm={2} md={2} lg={3} className="g-3">
          {filtered.map((b, i) => (
            <Col key={b._id}>
              <BuildingCard b={b} index={i} onEdit={openEditModal} />
            </Col>
          ))}
        </Row>
      )}

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={closeModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingId ? "Edit Building" : "Add Building"}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Building Name</Form.Label>
              <Form.Control
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Address</Form.Label>
              <Form.Control
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update Building" : "Add Building"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default AdminBuildings;
