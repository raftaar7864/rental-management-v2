// frontend/src/components/TenantView.jsx
import React, { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import {
  Modal,
  Button,
  Row,
  Col,
  Table,
  Spinner,
  Badge,
  Form
} from "react-bootstrap";
import { toast } from "react-toastify";
import TenantService from "../services/TenantService";

function fmtDateTime(d) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
}
function fmtShortDate(d) {
  if (!d) return "-";
  try {
    return new Date(d).toISOString().split("T")[0];
  } catch {
    return String(d);
  }
}

export default function TenantView({ tenant: initialTenant, onClose }) {
  const [tenant, setTenant] = useState(initialTenant || null);
  const [loading, setLoading] = useState(!initialTenant);
  const [refreshing, setRefreshing] = useState(false);

  const [editingMoveOut, setEditingMoveOut] = useState(false);
  const [moveOutValue, setMoveOutValue] = useState("");
  const [savingMoveOut, setSavingMoveOut] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const fetchTenant = useCallback(async (id) => {
    if (!id) return;
    try {
      setRefreshing(true);
      const res = await TenantService.getTenant(id);
      setTenant(res.data);
    } catch (err) {
      console.error("TenantView.fetchTenant:", err);
      toast.error(err?.response?.data?.message || "Failed to fetch tenant");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialTenant) return;
    const id = initialTenant._id || initialTenant.tenantId;
    fetchTenant(id);
  }, [initialTenant, fetchTenant]);

  useEffect(() => {
    setEditingMoveOut(false);
    setSavingMoveOut(false);
    setMoveOutValue(tenant?.moveOutDate ? fmtShortDate(tenant.moveOutDate) : "");
  }, [tenant]);

  if (!tenant && loading) {
    return (
      <Modal show centered onHide={onClose}>
        <Modal.Header closeButton>
          <Modal.Title>Tenant Details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-5">
          <Spinner animation="border" />
        </Modal.Body>
      </Modal>
    );
  }

  const payments = Array.isArray(tenant?.payments) ? [...tenant.payments] : [];
  payments.sort((a, b) => new Date(b.date) - new Date(a.date));

  const tenantHistory = tenant?.room?.tenantHistory || [];

  const canEditMoveOut = !!tenant?.moveOutDate;

  const startEditMoveOut = () => {
    setMoveOutValue(tenant.moveOutDate ? fmtShortDate(tenant.moveOutDate) : "");
    setEditingMoveOut(true);
  };

  const cancelEditMoveOut = () => {
    setEditingMoveOut(false);
    setMoveOutValue(tenant.moveOutDate ? fmtShortDate(tenant.moveOutDate) : "");
  };

  const saveMoveOut = async () => {
    if (!tenant || !tenant._id) return;
    const payload = { moveOutDate: moveOutValue ? new Date(moveOutValue) : null };
    try {
      setSavingMoveOut(true);
      await TenantService.updateTenant(tenant._id, payload);
      toast.success("Move-out date updated");
      await fetchTenant(tenant._id);
      setEditingMoveOut(false);
    } catch (err) {
      console.error("TenantView.saveMoveOut:", err);
      toast.error(err?.response?.data?.message || "Failed to update move-out date");
    } finally {
      setSavingMoveOut(false);
    }
  };

  const handlePrint = () => {
    try {
      const printUrl = `${window.location.origin}/print/tenant/${tenant._id}`;
      const w = window.open(printUrl, "_blank", "noopener,noreferrer");
      if (!w) {
        toast.warning("Popup blocked — opening in-app print preview. Use your browser's print button.");
        setShowPrintModal(true);
        return;
      }
      try { w.focus(); } catch {}
    } catch (err) {
      console.error("handlePrint error:", err);
      toast.error("Failed to open print view. Showing in-app preview.");
      setShowPrintModal(true);
    }
  };

  return (
    <>
      <Modal show centered size="lg" onHide={onClose}>
        <Modal.Header closeButton>
          <Modal.Title>
            Tenant: {tenant?.fullName || tenant?.tenantId || "-"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Row className="mb-3">
            <Col md={6}>
              <h6>Profile</h6>
              <div><strong>ID:</strong> {tenant.tenantId || "-"}</div>
              <div><strong>Email:</strong> {tenant.email || "-"}</div>
              <div><strong>Phone:</strong> {tenant.phone || "-"}</div>
              <div><strong>Gender:</strong> {tenant.gender || "-"}</div>
              <div style={{ marginTop: 6 }}><strong>Address:</strong><div className="small text-muted">{tenant.address || "-"}</div></div>
            </Col>

            <Col md={6}>
              <h6>Financials</h6>
              <div><strong>Rent Amount:</strong> ₹{tenant.rentAmount ? Number(tenant.rentAmount).toFixed(2) : "0.00"}</div>
              <div><strong>Advanced:</strong> ₹{tenant.advancedAmount ? Number(tenant.advancedAmount).toFixed(2) : "0.00"}</div>
              <div style={{ marginTop: 6 }}>
                <strong>Last Payment:</strong>{" "}
                {tenant.lastPayment?.amount ? `₹${tenant.lastPayment.amount} on ${fmtShortDate(tenant.lastPayment.date)}` : "-"}
              </div>
              <div>
                <strong>Due:</strong>{" "}
                {tenant.duePayment?.pendingAmount ? `₹${tenant.duePayment.pendingAmount} (Due: ${fmtShortDate(tenant.duePayment.dueDate)})` : "₹0.00"}
              </div>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <h6>Room</h6>
              <div><strong>Room:</strong> {tenant.room?.number || "-"}</div>
              <div><strong>Building:</strong> {tenant.room?.building?.name || "-"}</div>
              <div><strong>Move-in:</strong> {tenant.moveInDate ? fmtShortDate(tenant.moveInDate) : "-"}</div>

              <div className="mt-2 d-flex align-items-center">
                <strong className="me-2">Move-out:</strong>
                {editingMoveOut ? (
                  <>
                    <Form.Control
                      type="date"
                      value={moveOutValue || ""}
                      onChange={(e) => setMoveOutValue(e.target.value)}
                      style={{ maxWidth: 200 }}
                      disabled={savingMoveOut}
                    />
                    <div className="ms-2">
                      <Button size="sm" variant="success" onClick={saveMoveOut} disabled={savingMoveOut}>
                        {savingMoveOut ? <Spinner animation="border" size="sm" /> : "Save"}
                      </Button>{' '}
                      <Button size="sm" variant="secondary" onClick={cancelEditMoveOut} disabled={savingMoveOut}>
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>{tenant.moveOutDate ? fmtShortDate(tenant.moveOutDate) : <span className="text-muted">-</span>}</div>
                    {canEditMoveOut && (
                      <div className="ms-3">
                        <Button size="sm" variant="outline-primary" onClick={startEditMoveOut}>Edit</Button>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="mt-2"><strong>No. of Persons:</strong> {tenant.numberOfPersons || "-"}</div>
            </Col>

            <Col md={6}>
              <h6>Metadata</h6>
              <div><strong>Tenant Created:</strong> {fmtDateTime(tenant.createdAt)}</div>
              <div><strong>Record ID:</strong> <small className="text-muted">{tenant._id}</small></div>
              <div className="mt-2"><strong>Status:</strong> {tenant.moveOutDate ? <Badge bg="secondary">Moved Out</Badge> : <Badge bg="success">Active</Badge>}</div>
            </Col>
          </Row>

          <hr />

          <h6>Payment History</h6>
          {payments.length === 0 ? (
            <div className="text-muted mb-3">No payments recorded</div>
          ) : (
            <Table size="sm" bordered responsive>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount (₹)</th>
                  <th>Method</th>
                  <th>Receipt</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, idx) => (
                  <tr key={idx}>
                    <td>{fmtDateTime(p.date)}</td>
                    <td>{Number(p.amount).toFixed(2)}</td>
                    <td>{p.method || "-"}</td>
                    <td>{p.receiptNumber || "-"}</td>
                    <td style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          <hr />

          <h6>Room Tenant History</h6>
          {tenantHistory.length === 0 ? (
            <div className="text-muted">No tenant history available for this room</div>
          ) : (
            <Table size="sm" bordered responsive>
              <thead>
                <tr>
                  <th>Tenant Name</th>
                  <th>Tenant ID</th>
                  <th>Booking Date</th>
                  <th>Leaving Date</th>
                </tr>
              </thead>
              <tbody>
                {tenantHistory.map((h, i) => (
                  <tr key={i}>
                    <td>{h.fullName || "-"}</td>
                    <td>{h.tenantId || "-"}</td>
                    <td>{fmtShortDate(h.bookingDate)}</td>
                    <td>{h.leavingDate ? fmtShortDate(h.leavingDate) : <Badge bg="info">Active</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>

        <Modal.Footer>
          <div className="me-auto text-muted small">
            <Button variant="link" onClick={() => fetchTenant(tenant._id)} disabled={refreshing}>
              {refreshing ? <Spinner animation="border" size="sm" /> : "Refresh"}
            </Button>
          </div>

          <Button variant="outline-secondary" onClick={handlePrint}>Print</Button>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* In-app Print Modal Fallback */}
      {showPrintModal && (
        <Modal show centered size="lg" onHide={() => setShowPrintModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Print Preview - {tenant?.fullName || tenant?.tenantId}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <style>{`
              @media print {
                body * { visibility: hidden !important; }
                #tenant-print-area, #tenant-print-area * { visibility: visible !important; }
                #tenant-print-area { position: absolute; left:0; top:0; width:100%; }
              }
              #tenant-print-area table { width: 100%; border-collapse: collapse; }
              #tenant-print-area th, #tenant-print-area td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              #tenant-print-area th { background: #f6f6f6; }
            `}</style>

            <div id="tenant-print-area" style={{ fontFamily: "Arial, sans-serif", color: "#222" }}>
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>{tenant?.fullName || "Tenant"}</h3>
                <div style={{ color: "#666" }}>{tenant?.tenantId || ""}</div>
              </div>

              <div style={{ display: "flex", gap: 20, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <table>
                    <tbody>
                      <tr><th>Full name</th><td>{tenant?.fullName || "-"}</td></tr>
                      <tr><th>Tenant ID</th><td>{tenant?.tenantId || "-"}</td></tr>
                      <tr><th>Email</th><td>{tenant?.email || "-"}</td></tr>
                      <tr><th>Phone</th><td>{tenant?.phone || "-"}</td></tr>
                      <tr><th>Gender</th><td>{tenant?.gender || "-"}</td></tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ flex: 1 }}>
                  <table>
                    <tbody>
                      <tr><th>Building</th><td>{tenant?.room?.building?.name || "-"}</td></tr>
                      <tr><th>Room</th><td>{tenant?.room?.number || "-"}</td></tr>
                      <tr><th>Rent</th><td>₹{tenant?.rentAmount ? Number(tenant.rentAmount).toFixed(2) : "0.00"}</td></tr>
                      <tr><th>Advance</th><td>₹{tenant?.advancedAmount ? Number(tenant.advancedAmount).toFixed(2) : "0.00"}</td></tr>
                      <tr><th>Move-in</th><td>{tenant?.moveInDate ? fmtShortDate(tenant.moveInDate) : "-"}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <h5>Payments</h5>
              <table>
                <thead>
                  <tr><th>Date</th><th>Amount</th><th>Method</th><th>Receipt</th></tr>
                </thead>
                <tbody>
                  {(tenant?.payments || []).length === 0 ? (
                    <tr><td colSpan="4" style={{ color: "#666" }}>No payments</td></tr>
                  ) : (tenant.payments || []).map((p, i) => (
                    <tr key={i}>
                      <td>{new Date(p.date).toLocaleString()}</td>
                      <td>₹{Number(p.amount).toFixed(2)}</td>
                      <td>{p.method || "-"}</td>
                      <td>{p.receiptNumber || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: 12, color: "#666", fontSize: 12 }}>
                Printed: {new Date().toLocaleString()}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPrintModal(false)}>Close</Button>
            <Button variant="primary" onClick={() => window.print()}>Print</Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
}

TenantView.propTypes = {
  tenant: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};
