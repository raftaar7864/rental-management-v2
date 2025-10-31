// src/pages/AdminBills.jsx
import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Spinner,
  Badge,
  Row,
  Col,
  Container,
  Card,
  InputGroup,
} from "react-bootstrap";
import {RefreshCw} from "lucide-react";
import { toast } from "react-toastify";
import BillService from "../services/BillService";
import * as BuildingService from "../services/BuildingService";
import { motion } from "framer-motion";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
// removed: import * as XLSX from "xlsx";

export default function AdminBills() {
  const [bills, setBills] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPayModal, setShowPayModal] = useState(false);
  const [payBill, setPayBill] = useState(null);
  const [paymentRef, setPaymentRef] = useState("");
  const [payLoading, setPayLoading] = useState(false);

  const [sortPaymentAsc, setSortPaymentAsc] = useState(true);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [query, setQuery] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    fetchBuildings();
    fetchBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedBills = [...bills].sort((a, b) => {
    const aStatus = (a.paymentStatus === "Paid" || (a.status || "").toLowerCase() === "paid") ? 1 : 0;
    const bStatus = (b.paymentStatus === "Paid" || (b.status || "").toLowerCase() === "paid") ? 1 : 0;
    return sortPaymentAsc ? aStatus - bStatus : bStatus - aStatus;
  });

  const fetchBuildings = async () => {
    try {
      const res = await BuildingService.getBuildings();
      setBuildings(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch buildings");
    }
  };

  const fetchBills = async (buildingId = "", month = "") => {
    try {
      setLoading(true);
      let allBills = await BillService.getBills();
      if (!Array.isArray(allBills)) allBills = allBills.data || [];
      // normalize room.building location (existing code pattern)
      allBills = allBills.map((b) => ({
        ...b,
        room: { ...(b.room || {}), building: b.room?.building || b.building || null },
      }));

      if (buildingId) {
        allBills = allBills.filter((b) => b.room?.building?._id === buildingId);
      }

      // Capture unique months (YYYY-MM)
      const months = Array.from(
        new Set(
          allBills
            .map((b) => (typeof b.billingMonth === "string" ? b.billingMonth.slice(0, 7) : b.billingMonth ? b.billingMonth.toString().slice(0, 7) : null))
            .filter(Boolean)
        )
      ).sort((a, z) => (a < z ? 1 : -1));
      setAvailableMonths(months);

      if (month) {
        allBills = allBills.filter((b) => (b.billingMonth || "").startsWith(month));
      }

      setBills(allBills);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to fetch bills");
    } finally {
      setLoading(false);
    }
  };

  const openPay = (bill) => {
    setPayBill(bill);
    setPaymentRef("");
    setShowPayModal(true);
  };

  const handleMarkPaid = async () => {
    if (!payBill) return;
    try {
      setPayLoading(true);
      await BillService.markPaid(payBill._id, { paymentRef: paymentRef || `manual_${Date.now()}`, paidAt: new Date() });
      toast.success("Bill marked as paid");
      setShowPayModal(false);
      setPayBill(null);
      fetchBills(selectedBuilding, selectedMonth);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to mark paid");
    } finally {
      setPayLoading(false);
    }
  };

  const statusBadge = (bill) => {
    const paid = bill?.paymentStatus === "Paid" || (bill?.status || "").toLowerCase() === "paid";
    if (paid) return <Badge bg="success">Paid</Badge>;
    if ((bill?.paymentStatus || "").toLowerCase() === "partial" || (bill?.status || "").toLowerCase() === "partial")
      return <Badge bg="warning">Partial</Badge>;
    return <Badge bg="danger">Unpaid</Badge>;
  };

  // Export currently displayed bills to Excel using exceljs (dynamic import)
  const exportToExcel = async (rows = []) => {
    if (!rows || !rows.length) {
      toast.info("No data to export");
      return;
    }

    let ExcelJS;
    try {
      const mod = await import("exceljs");
      ExcelJS = mod && mod.default ? mod.default : mod;
    } catch (err) {
      console.error("Failed to load exceljs:", err);
      toast.error("Export failed: exceljs library not available");
      return;
    }

    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = "Rental Manager";
      wb.created = new Date();
      const ws = wb.addWorksheet("Bills");

      // define columns
      ws.columns = [
        { header: "#", key: "idx", width: 6 },
        { header: "Tenant", key: "tenant", width: 30 },
        { header: "Room", key: "room", width: 12 },
        { header: "Building", key: "building", width: 20 },
        { header: "Month", key: "month", width: 14 },
        { header: "Amount", key: "amount", width: 14 },
        { header: "Status", key: "status", width: 12 },
        { header: "PaidAt", key: "paidAt", width: 20 },
        { header: "PaymentRef", key: "paymentRef", width: 25 },
      ];

      // add rows
      rows.forEach((r, i) => {
        ws.addRow({
          idx: i + 1,
          tenant: r.tenant?.fullName || r.tenant?.name || r.tenantId || "-",
          room: r.room?.number || r.roomId || "-",
          building: r.room?.building?.name || r.building?.name || "-",
          month: r.billingMonth ? (typeof r.billingMonth === "string" ? r.billingMonth.slice(0, 7) : String(r.billingMonth).slice(0, 7)) : "-",
          amount: Number(r.totalAmount || r.amount || r.computedAmount || 0),
          status: r.paymentStatus || r.status || "-",
          paidAt: r.paidDate || r.paidAt || r.updatedAt || "",
          paymentRef: r.paymentRef || "",
        });
      });

      // basic styling: bold header
      ws.getRow(1).font = { bold: true };

      // auto-filter
      ws.autoFilter = { from: "A1", to: `I1` };

      // generate buffer & download
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bills_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Exported to Excel");
    } catch (err) {
      console.error("Excel export error:", err);
      toast.error("Failed to export Excel");
    }
  };

  // filter by search query (tenant name or room)
  const filtered = sortedBills.filter((b) => {
    if (!query) return true;
    const q = query.toLowerCase();
    const t = (b.tenant?.fullName || b.tenant?.name || "").toLowerCase();
    const r = (b.room?.number || b.roomId || "").toString().toLowerCase();
    return t.includes(q) || r.includes(q);
  });

  return (
    <Container className="py-3">
      {/* Header + actions */}
      <Row className="align-items-center mb-3">
        <Col>
          <motion.h3 initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            Generated Bills
          </motion.h3>
        </Col>

        <Col className="text-end">
          <div className="d-flex justify-content-end gap-2">
            <Button
              variant="outline-secondary"
              onClick={() => {
                setSelectedBuilding("");
                setSelectedMonth("");
                setQuery("");
                fetchBills();
              }}
            >
              <RefreshCw  size={16} className="me-1"/>Refresh
            </Button>

            <Button
              variant="outline-primary"
              onClick={() => exportToExcel(filtered)}
              className="d-flex align-items-center gap-2"
            >
              📥 Export Excel
            </Button>
          </div>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="g-3 mb-3">
        <Col xs={12} md={6} lg={4}>
          <Card className="p-3 h-100 shadow-sm" style={{ borderRadius: 12 }}>
            <Form.Group>
              <Form.Label className="fw-bold">Building</Form.Label>
              <Form.Select
                value={selectedBuilding}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedBuilding(id);
                  fetchBills(id, selectedMonth);
                }}
              >
                <option value="">All buildings</option>
                {buildings.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Card>
        </Col>

        <Col xs={12} md={6} lg={4}>
          <Card className="p-3 h-100 shadow-sm" style={{ borderRadius: 12 }}>
            <Form.Group>
              <Form.Label className="fw-bold">Month</Form.Label>
              <Form.Select
                value={selectedMonth}
                onChange={(e) => {
                  const m = e.target.value;
                  setSelectedMonth(m);
                  fetchBills(selectedBuilding, m);
                }}
              >
                <option value="">All months</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {new Date(m + "-01").toLocaleString(undefined, { month: "long", year: "numeric" })}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">Only months with generated bills</Form.Text>
            </Form.Group>
          </Card>
        </Col>

        <Col xs={12} md={12} lg={4}>
          <Card className="p-3 h-100 shadow-sm" style={{ borderRadius: 12 }}>
            <Form.Group>
              <Form.Label className="fw-bold">Search</Form.Label>
              <InputGroup>
                <Form.Control
                  placeholder="Search tenant or room..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <Button variant="outline-secondary" onClick={() => exportToExcel(filtered)}>
                  Export
                </Button>
              </InputGroup>
            </Form.Group>

            <div className="mt-1 d-flex justify-content-between">
              <div className="mt-1 d-flex justify-content-center align-items-center flex-column text-center">
                <div className="small text-muted">Paid</div>
                <div className="fw-bold">
                  {bills.filter((bill) => (bill.paymentStatus || bill.status || "").toLowerCase() === "paid").length}
                </div>
              </div>
              <div className="mt-1 d-flex justify-content-center align-items-center flex-column text-center">
                <div className="small text-muted">Unpaid</div>
                <div className="fw-bold">
                  {bills.filter((bill) => (bill.paymentStatus || bill.status || "").toLowerCase() !== "paid").length}
                </div>
              </div>
              <div className="mt-1 d-flex justify-content-center align-items-center flex-column text-center">
                <div className="small text-muted">Generated</div>
                <div className="fw-bold">{bills.length}</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <Table striped bordered hover responsive className="shadow-sm bg-white rounded">
          <thead className="table-dark">
            <tr>
              <th style={{ width: 48 }}>#</th>
              <th>Tenant</th>
              <th>Room</th>
              <th>Month</th>
              <th style={{ textAlign: "right" }}>Amount (₹)</th>
              <th>
                Payment Status
                <Button size="sm" variant="link" onClick={() => setSortPaymentAsc(!sortPaymentAsc)} className="p-0 ms-2">
                  {sortPaymentAsc ? "↑" : "↓"}
                </Button>
              </th>
              <th style={{ width: 260 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-4">
                  <Spinner animation="border" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-4">
                  No bills found
                </td>
              </tr>
            ) : (
              filtered.map((b, idx) => (
                <motion.tr key={b._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}>
                  <td>{idx + 1}</td>
                  <td>{b.tenant?.fullName || "-"}</td>
                  <td>{b.room?.number || "-"}</td>
                  <td>{b.billingMonth ? new Date(b.billingMonth).toLocaleString("default", { month: "short", year: "numeric" }) : "-"}</td>
                  <td style={{ textAlign: "right" }}>{Number(b.totalAmount || 0).toFixed(2)}</td>
                  <td>{statusBadge(b)}</td>
                  <td className="d-flex gap-2">
                    {((b.paymentStatus || "").toLowerCase() === "paid" || (b.status || "").toLowerCase() === "paid") ? (
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={async () => {
                          try {
                            const blob = await BillService.getBillPdf(b._id);
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `bill_${b._id}.pdf`;
                            a.click();
                            window.URL.revokeObjectURL(url);
                          } catch (err) {
                            console.error(err);
                            toast.error("Failed to download slip");
                          }
                        }}
                      >
                        Download Slip
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" variant="success" onClick={() => openPay(b)}>
                          Mark Paid
                        </Button>
                        <Button size="sm" variant="primary" onClick={() => navigate(`/payment/${b._id}`)}>
                          Pay Online
                        </Button>
                      </>
                    )}
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </Table>
      </motion.div>

      {/* Mark Paid modal */}
      <Modal show={showPayModal} onHide={() => setShowPayModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Mark Bill Paid</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {payBill && (
            <>
              <p>
                Mark bill for <strong>{payBill.tenant?.fullName || payBill.tenant?.tenantId}</strong> (₹
                {Number(payBill.totalAmount || 0).toFixed(2)}) as paid.
              </p>

              <Form.Group className="mb-2">
                <Form.Label>Payment Reference</Form.Label>
                <Form.Control
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Enter payment reference or leave blank"
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPayModal(false)} disabled={payLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleMarkPaid} disabled={payLoading}>
            {payLoading ? (
              <>
                <Spinner animation="border" size="sm" /> Processing
              </>
            ) : (
              "Confirm Paid"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
