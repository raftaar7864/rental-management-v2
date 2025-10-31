// frontend/src/components/AdminManagers.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import axios from "../api/axios";
import { toast } from "react-toastify";
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
import { Search, RefreshCw, UserPlus, Edit, Trash2 } from "lucide-react";
import "react-toastify/dist/ReactToastify.css";

/**
 * AdminManagers (styled like ManagerRooms / AdminRooms)
 * - Top header: title + search + refresh
 * - Left card: Create manager form (collapses on small screens)
 * - Right: managers grid (cards) with Edit / Delete actions
 * - Edit uses a modal (pre-fills fields)
 *
 * Behavior preserved from your original component.
 */

export default function AdminManagers() {
  const [managers, setManagers] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Create form
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    building: ""
  });

  // Edit modal form
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    id: "",
    name: "",
    email: "", // disabled in UI
    password: "",
    building: ""
  });

  // UI: search & debounce
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchRef = useRef(null);

  // Fetch initial data
  useEffect(() => {
    let mounted = true;
    async function fetchAll() {
      setFetching(true);
      try {
        const [mRes, bRes] = await Promise.all([
          axios.get("/auth/managers"),
          axios.get("/buildings")
        ]);
        if (!mounted) return;
        setManagers(Array.isArray(mRes.data) ? mRes.data : []);
        setBuildings(Array.isArray(bRes.data) ? bRes.data : []);
      } catch (err) {
        console.error("Failed to load managers/buildings", err);
        toast.error("Failed to load managers or buildings. See console.");
      } finally {
        if (mounted) setFetching(false);
      }
    }
    fetchAll();
    return () => { mounted = false; };
  }, []);

  const reloadManagers = async () => {
    try {
      const res = await axios.get("/auth/managers");
      setManagers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed reload managers", err);
      toast.error("Failed to reload managers");
    }
  };

  // Debounce search for 250ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch((search || "").trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const filteredManagers = useMemo(() => {
    const q = debouncedSearch;
    if (!q) return managers;
    return managers.filter((m) => {
      const name = (m.name || "").toLowerCase();
      const email = (m.email || "").toLowerCase();
      const buildingName = (m.building?.name || "").toLowerCase();
      return name.includes(q) || email.includes(q) || buildingName.includes(q);
    });
  }, [managers, debouncedSearch]);

  // ---------------- Create ----------------
  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const { name, email, password, building } = createForm;
    if (!name || !email || !password || !building) {
      return toast.warn("Please fill all fields and assign a building.");
    }
    setLoading(true);
    try {
      await axios.post("/auth/register", {
        name,
        email,
        password,
        role: "manager",
        building
      });
      setCreateForm({ name: "", email: "", password: "", building: "" });
      await reloadManagers();
      toast.success("Manager created.");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to create manager");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Edit ----------------
  const openEdit = (mgr) => {
    setEditForm({
      id: mgr._id,
      name: mgr.name || "",
      email: mgr.email || "",
      password: "",
      building: mgr.building?._id || ""
    });
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    const { id, name, password, building } = editForm;
    if (!id) return;
    setLoading(true);
    try {
      const payload = {};
      if (typeof name === "string") payload.name = name.trim();
      if (password && password.trim() !== "") payload.password = password;
      if (building === "") payload.building = null;
      else payload.building = building;

      await axios.put(`/auth/managers/${id}`, payload);

      setShowEditModal(false);
      setEditForm({ id: "", name: "", email: "", password: "", building: "" });
      await reloadManagers();
      toast.success("Manager updated.");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to update manager");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Delete ----------------
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this manager? This cannot be undone.")) return;
    setLoading(true);
    try {
      await axios.delete(`/auth/managers/${id}`);
      setManagers(prev => prev.filter(m => m._id !== id));
      toast.success("Manager deleted.");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to delete manager");
    } finally {
      setLoading(false);
    }
  };

  // --- quick UI helpers
  const clearCreateForm = () => setCreateForm({ name: "", email: "", password: "", building: "" });
  const refreshAll = async () => {
    setFetching(true);
    await Promise.all([reloadManagers(), (async () => {
      try {
        const r = await axios.get("/buildings");
        setBuildings(Array.isArray(r.data) ? r.data : []);
      } catch (e) { /* ignore */ }
    })()]);
    setTimeout(() => setFetching(false), 250);
  };

  return (
    <Container className="py-2">
      {/* Top header */}
      <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap">
        <div>
          <h3 className="mb-1">Manage Managers</h3>
          <div className="text-muted small">Create and manage building managers</div>
        </div>

        <div className="d-flex gap-2 align-items-center mt-2">
          <InputGroup style={{ width: 360 }}>
            <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", zIndex: 2 }}>
              <Search size={16} className="text-muted" />
            </div>
            <Form.Control
              style={{ paddingLeft: 40, borderRadius: 10 }}
              placeholder="Search by name, email or building"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              ref={searchRef}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setDebouncedSearch((search || "").trim().toLowerCase());
                }
              }}
            />
            <Button variant="outline-secondary" onClick={() => { setSearch(""); setDebouncedSearch(""); if (searchRef.current) searchRef.current.value = ""; }}>
              Clear
            </Button>
          </InputGroup>
        </div>
      </div>

      <Row className="g-3">
        {/* Left: Create manager card */}
        <Col xs={12} md={4}>
          <Card className="shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center gap-2 mb-2">
                <UserPlus size={18} className="text-muted" />
                <h5 className="mb-0">Create Manager</h5>
              </div>

              <Form onSubmit={handleCreate}>
                <Form.Group className="mb-2">
                  <Form.Label className="small mb-1">Name</Form.Label>
                  <Form.Control
                    name="name"
                    value={createForm.name}
                    onChange={handleCreateChange}
                    placeholder="Name"
                    autoComplete="name"
                  />
                </Form.Group>

                <Form.Group className="mb-2">
                  <Form.Label className="small mb-1">Email</Form.Label>
                  <Form.Control
                    name="email"
                    value={createForm.email}
                    onChange={handleCreateChange}
                    placeholder="Email (unique)"
                    autoComplete="email"
                  />
                </Form.Group>

                <Form.Group className="mb-2">
                  <Form.Label className="small mb-1">Password</Form.Label>
                  <Form.Control
                    name="password"
                    type="password"
                    value={createForm.password}
                    onChange={handleCreateChange}
                    placeholder="Password"
                    autoComplete="new-password"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="small mb-1">Assign Building</Form.Label>
                  <Form.Select name="building" value={createForm.building} onChange={handleCreateChange}>
                    <option value="">Assign Building</option>
                    {buildings.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </Form.Select>
                </Form.Group>

                <div className="d-flex gap-2">
                  <Button type="submit" variant="primary" disabled={loading}>
                    {loading ? <><Spinner animation="border" size="sm" /> Creating...</> : "Create Manager"}
                  </Button>
                  <Button variant="secondary" onClick={clearCreateForm} disabled={loading}>Clear</Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        {/* Right: Managers list */}
        <Col xs={12} md={8}>
          <Card className="shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <strong>Managers</strong>
                  <div className="small text-muted">{filteredManagers.length} / {managers.length} shown</div>
                </div>
                <div style={{ position: "absolute", right: 12}}>
          <Button variant="outline-secondary" className="ms-2" onClick={refreshAll}>
            <RefreshCw size={16} className="me-1" /> Refresh
          </Button></div>
                <div className="small text-muted">{fetching ? "Loading..." : ""}</div>
              </div>

              {fetching ? (
                <div className="text-center py-4"><Spinner /></div>
              ) : filteredManagers.length === 0 ? (
                <div className="text-muted text-center py-4">No managers found.</div>
              ) : (
                <Row xs={1} sm={1} md={1} lg={1} className="g-3">
                  {filteredManagers.map((m) => (
                    <Col key={m._id}>
                      <Card className="h-100">
                        <Card.Body className="d-flex justify-content-between align-items-center">
                          <div>
                            <div className="fw-semibold">{m.name}</div>
                            <div className="small text-muted">{m.email}</div>
                            <div className="small mt-1">
                              <Badge bg="light" text="dark" className="border">
                                {m.building?.name || "Unassigned"}
                              </Badge>
                            </div>
                          </div>

                          <div className="d-flex gap-2 align-items-center">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => openEdit(m)}
                              title="Edit"
                            >
                              <Edit size={14} className="me-1" /> Edit
                            </Button>

                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(m._id)}
                              title="Delete"
                            >
                              <Trash2 size={14} className="me-1" /> Delete
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Edit modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Manager</Modal.Title>
        </Modal.Header>
        <Form onSubmit={submitEdit}>
          <Modal.Body>
            <Form.Group className="mb-2">
              <Form.Label className="small mb-1">Name</Form.Label>
              <Form.Control name="name" value={editForm.name} onChange={handleEditChange} />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label className="small mb-1">Email</Form.Label>
              <Form.Control name="email" value={editForm.email} disabled style={{ background: "#f5f5f5" }} />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label className="small mb-1">New password (leave blank to keep)</Form.Label>
              <Form.Control name="password" type="password" value={editForm.password} onChange={handleEditChange} />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label className="small mb-1">Building</Form.Label>
              <Form.Select name="building" value={editForm.building} onChange={handleEditChange}>
                <option value="">-- Unassign / No change --</option>
                {buildings.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </Form.Select>
            </Form.Group>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={loading}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? <><Spinner animation="border" size="sm" /> Updating...</> : "Update Manager"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}
