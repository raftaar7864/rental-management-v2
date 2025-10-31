import React, { useEffect, useRef, useState } from "react";
import NavBar from "../components/NavBar";
import {
  Row,
  Col,
  Card,
  Table,
  Spinner,
  Button,
  Badge,
  OverlayTrigger,
  Tooltip,
  Container,
} from "react-bootstrap";
import axios from "../api/axios";
import { Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, ArcElement, PointElement, LineElement, Title, ChartTooltip, Legend, Filler);

const STATUS_COLORS = { Paid: "#198754", Unpaid: "#dc3545" };
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const NAV_HEIGHT = 72; // keep in sync with NavBar fixed height

// helper to compute amount robustly
function computeAmountFromBill(b) {
  if (!b) return 0;
  const tryNum = (v) => {
    if (v == null) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };
  const candidates = [b.totalAmount, b.total, b.amount, b.totals?.totalAmount, b.totals?.total];
  for (const c of candidates) {
    const n = tryNum(c);
    if (n != null) return n;
  }
  if (Array.isArray(b.charges) && b.charges.length) {
    let sum = 0;
    b.charges.forEach((c) => {
      const a = tryNum(c.amount);
      if (a != null) sum += a;
    });
    if (sum !== 0) return sum;
  }
  if (b.totals) {
    const rent = tryNum(b.totals.rent) || tryNum(b.totals.rentAmount) || 0;
    const elec = tryNum(b.totals.electricity) || 0;
    const add = tryNum(b.totals.additionalAmount) || tryNum(b.totals.additional) || 0;
    const disc = tryNum(b.totals.discount) || 0;
    const proc = tryNum(b.totals.processingFee) || tryNum(b.totals.processing) || 0;
    const computed = Math.round(rent + elec + add - disc + proc);
    if (computed) return computed;
  }
  return 0;
}

const shortDate = (d) => (d ? new Date(d).toISOString().split("T")[0] : "-");

export default function AdminDashboard({ userProp }) {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ buildings: 0, rooms: 0, tenants: 0 });
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [generatedBillsList, setGeneratedBillsList] = useState([]);
  const [billStatusCounts, setBillStatusCounts] = useState({ paid: 0, unpaid: 0 });
  const [recentMoveIns, setRecentMoveIns] = useState([]);
  const [recentMoveOuts, setRecentMoveOuts] = useState([]);
  const pieRef = useRef(null);
  const [selectedPieSlice, setSelectedPieSlice] = useState(null);

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const [bRes, rRes, tRes, billRes] = await Promise.all([
        axios.get("/buildings").catch(() => ({ data: [] })),
        axios.get("/rooms").catch(() => ({ data: [] })),
        axios.get("/tenants").catch(() => ({ data: [] })),
        axios.get("/bills?limit=0").catch(() => ({ data: [] })),
      ]);

      const buildings = bRes?.data || [];
      const rooms = rRes?.data || [];
      const tenants = tRes?.data || [];
      const billsData = billRes?.data || [];

      setCounts({ buildings: buildings.length, rooms: rooms.length, tenants: tenants.length });
      setBills(billsData);

      // payments array (derived)
      const paymentsFlatten = (billsData || [])
        .filter((b) => ((b.status || b.paymentStatus) || "").toString().toLowerCase() === "paid")
        .map((b) => ({ date: b.paidDate || b.paidAt || b.updatedAt || b.date || b.generatedAt || b.createdAt, amount: b.paidAmount || b.amount || b.totalAmount || 0 }));
      setPayments(paymentsFlatten);

      // build generated list (tolerant)
      const generated = (billsData || []).filter((b) => {
        if (!b) return false;
        if (b.generated === true) return true;
        if (b.billingMonth) return true;
        if (b.generatedAt || b.createdAt) return true;
        if (Array.isArray(b.charges) && b.charges.length) return true;
        if (b.totals) return true;
        return false;
      });

      const withDates = generated.map((b) => {
        const possible = b.generatedAt || b.paidDate || b.paidAt || b.updatedAt || b.createdAt || b.billingMonth || b.date;
        const d = possible ? new Date(possible) : null;
        const iso = d && !isNaN(d.getTime()) ? d.toISOString() : null;
        const computedAmount = computeAmountFromBill(b);
        return { ...(b || {}), _generatedDate: iso, computedAmount };
      });

      withDates.sort((a, z) => {
        const da = a._generatedDate ? new Date(a._generatedDate).getTime() : 0;
        const dz = z._generatedDate ? new Date(z._generatedDate).getTime() : 0;
        return dz - da;
      });

      setGeneratedBillsList(withDates.slice(0, 20));

      const statusCounts = { paid: 0, unpaid: 0 };
      (billsData || []).forEach((b) => {
        const s = (b.paymentStatus || b.status || "").toString().toLowerCase();
        if (s === "paid") statusCounts.paid++;
        else statusCounts.unpaid++;
      });
      setBillStatusCounts(statusCounts);

      const withMoveIn = (tenants || []).filter((t) => t.moveInDate).sort((a, b) => new Date(b.moveInDate) - new Date(a.moveInDate));
      const withMoveOut = (tenants || []).filter((t) => t.moveOutDate).sort((a, b) => new Date(b.moveOutDate) - new Date(a.moveOutDate));
      setRecentMoveIns(withMoveIn.slice(0, 6));
      setRecentMoveOuts(withMoveOut.slice(0, 6));
    } catch (err) {
      console.error("fetchDashboard:", err);
      setCounts({ buildings: 0, rooms: 0, tenants: 0 });
      setBills([]);
      setPayments([]);
      setGeneratedBillsList([]);
      setRecentMoveIns([]);
      setRecentMoveOuts([]);
    } finally {
      setLoading(false);
    }
  }

  // charts
  const pieData = { labels: ["Paid", "Unpaid"], datasets: [{ data: [billStatusCounts.paid, billStatusCounts.unpaid], backgroundColor: [STATUS_COLORS.Paid, STATUS_COLORS.Unpaid], hoverOffset: 8 }] };

  const paymentsByMonth = Array(12).fill(0);
  payments.forEach((p) => {
    const d = p?.date ? new Date(p.date) : null;
    if (d && !isNaN(d.getTime())) paymentsByMonth[d.getMonth()] += Number(p.amount || 0);
  });
  const lineData = { labels: monthNames, datasets: [{ label: "Payments", data: paymentsByMonth, tension: 0.3, fill: true }] };

  const onPieClick = (event) => {
    if (!pieRef.current) return;
    try {
      const chart = pieRef.current;
      const elements = typeof event.nativeEvent !== "undefined" && chart.getElementsAtEventForMode ? chart.getElementsAtEventForMode(event.nativeEvent, "nearest", { intersect: true }, true) : [];
      if (elements && elements.length) {
        const idx = elements[0].index;
        const lbl = pieData.labels[idx];
        setSelectedPieSlice(selectedPieSlice === lbl ? null : lbl);
      }
    } catch (e) {
      /* ignore */
    }
  };

  const filteredGenerated = generatedBillsList.filter((b) => {
    if (!selectedPieSlice) return true;
    const s = (b.paymentStatus || b.status || "").toString().toLowerCase();
    if (selectedPieSlice === "Paid") return s === "paid";
    if (selectedPieSlice === "Unpaid") return s !== "paid";
    return true;
  });

  if (loading) {
    return (
      <>
        <NavBar />
        <div style={{ paddingTop: NAV_HEIGHT }} className="d-flex justify-content-center align-items-center vh-75">
          <Spinner animation="border" variant="primary" />
        </div>
      </>
    );
  }

  return (
<>
  <NavBar />
  <div
    style={{
      paddingTop: "2px", // NavBar height
      paddingBottom: "10px", // Footer height
      minHeight: "calc(100vh - 2px - 10px)",
      background: "transparent",
    }}
  >
<Container fluid className="py-3" style={{ height: "100%" }}>

  {/* Second row: Bills + Payments (chart) */}
  <Row className="g-4 mb-3">
    {/* Bills - wider */}
  <Col xs={12} md={12} lg={8}>
    <Card
      className="border-0 shadow-lg h-100"
      style={{ minHeight: 420, borderRadius: "20px", overflow: "hidden" }}
    >
      {/* Gradient Header */}
      <div
        className="text-white d-flex justify-content-between align-items-center px-4"
        style={{
          background: "linear-gradient(90deg, #637d84ff 0%, #577d9cff 100%)",
          height: 64,
          fontWeight: 600,
          letterSpacing: "0.3px",
        }}
      >
        <div className="d-flex align-items-center gap-3">
          <div style={{ fontSize: 18 }}>🧾</div>
          <div>
            <div style={{ fontSize: 16 }}>Bills — Generated (latest)</div>
            <small className="d-none d-sm-block" style={{ opacity: 0.9 }}>
              Recent bills, amounts and payment status
            </small>
          </div>
        </div>
      </div>

      <Card.Body className="p-4 d-flex flex-column">
        {/* Top badges / summary row */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex gap-2 align-items-center">
            <div className="d-flex gap-2">
              <div style={{ background: "#e9f7ef", borderRadius: 12, padding: "6px 10px" }}>
                <div className="small text-success">Paid</div>
                <div className="fw-bold">{billStatusCounts.paid}</div>
              </div>
              <div style={{ background: "#fdecea", borderRadius: 12, padding: "6px 10px" }}>
                <div className="small text-danger">Unpaid</div>
                <div className="fw-bold">{billStatusCounts.unpaid}</div>
              </div>
            </div>
          </div>

          <div className="small text-muted d-none d-md-block">Click a pie slice to filter the table</div>
        </div>

        <div className="d-flex gap-3 flex-column flex-md-row" style={{ flex: 1, minHeight: 260 }}>
          {/* Pie column */}
          <div style={{ width: 260, flexShrink: 0 }}>
            <div
              style={{
                height: 220,
                borderRadius: 12,
                padding: 8,
                background: "linear-gradient(180deg, #ffffff, #f8f9ff)",
                boxShadow: "inset 0 1px 0 rgba(0,0,0,0.02)",
              }}
            >
              <Pie ref={pieRef} data={pieData} onClick={onPieClick} />
            </div>

            <div className="small text-muted mt-2">Breakdown by payment status</div>

            {selectedPieSlice && (
              <div className="mt-2 d-flex align-items-center gap-2">
                <div className="small text-muted">Selected:</div>
                <div className="fw-bold">{selectedPieSlice}</div>
                <Button size="sm" variant="link" onClick={() => setSelectedPieSlice(null)}>
                  clear
                </Button>
              </div>
            )}
          </div>

          {/* Table column */}
          <div className="flex-fill" style={{ overflow: "hidden" }}>
            <div
              style={{
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
                background: "#fff",
                height: 280, // fixed visible height
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "thin" }}>
                <Table size="sm" hover responsive className="mb-0 align-middle">
                  <thead style={{ background: "#fbfcff", position: "sticky", top: 0, zIndex: 2 }}>
                    <tr>
                      <th style={{ width: 140 }}>Room</th>
                      <th style={{ minWidth: 140, textAlign: "right" }}>Amount</th>
                      <th>Status</th>
                      <th>Generated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGenerated.length ? (
                      filteredGenerated.map((b) => (
                        <tr key={b._id || b.billId}>
                          <td style={{ paddingTop: 14, paddingBottom: 14 }}>
                            {b.room?.number || (b.roomId ? String(b.roomId) : "-")}
                          </td>
                          <td style={{ textAlign: "right", paddingTop: 14, paddingBottom: 14 }}>
                            {(b.computedAmount ?? b.amount ?? b.totalAmount ?? 0).toFixed
                              ? Number(b.computedAmount ?? b.amount ?? b.totalAmount ?? 0).toFixed(2)
                              : b.computedAmount ?? b.amount ?? b.totalAmount ?? 0}
                          </td>
                          <td style={{ paddingTop: 14, paddingBottom: 14 }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "6px 10px",
                                borderRadius: 999,
                                background:
                                  (b.paymentStatus || b.status || "").toString().toLowerCase() === "paid"
                                    ? "rgba(25,135,84,0.12)"
                                    : (b.paymentStatus || b.status || "").toString().toLowerCase() === "partial"
                                    ? "rgba(255,193,7,0.12)"
                                    : "rgba(220,53,69,0.08)",
                                color:
                                  (b.paymentStatus || b.status || "").toString().toLowerCase() === "paid"
                                    ? "#198754"
                                    : (b.paymentStatus || b.status || "").toString().toLowerCase() === "partial"
                                    ? "#ffb300"
                                    : "#dc3545",
                                fontWeight: 600,
                                fontSize: 13,
                              }}
                            >
                              {b.status || b.paymentStatus || "-"}
                            </span>
                          </td>
                          <td style={{ paddingTop: 14, paddingBottom: 14 }}>
                            {shortDate(b._generatedDate || b.generatedAt || b.billingMonth || b.createdAt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-4">
                          No generated bills
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  </Col>


    {/* Payments chart - narrow column */}
    <Col xs={12} md={12} lg={4}>
      <Card
        className="border-0 shadow-lg h-100"
        style={{
          minHeight: 420,
          borderRadius: "20px",
          overflow: "hidden",
        }}
      >
        {/* Gradient Header */}
        <div
          className="text-white text-center py-3"
          style={{
            background: "linear-gradient(90deg, #8b733eff 0%, #12902fff 100%)",
            fontWeight: 600,
            fontSize: "1.1rem",
            letterSpacing: "0.3px",
          }}
        >
          💳 Payments — Last 12 Months
        </div>

        <Card.Body className="p-4 d-flex flex-column">
          {/* Chart */}
          <div
            style={{
              height: 220,
              marginBottom: 20,
              background: "linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)",
              borderRadius: "12px",
              padding: "8px",
            }}
          >
            <Line data={lineData} options={{ maintainAspectRatio: false }} />
          </div>

          {/* Summary Section */}
          <div className="mt-auto">
            <div className="text-muted small fw-semibold mb-2 text-uppercase">
              Summary
            </div>
            <div className="d-flex gap-3">
              <Card
                className="flex-fill border-0 shadow-sm text-center py-3"
                style={{ borderRadius: "14px", background: "#e3f2fd" }}
              >
                <div className="text-primary small mb-1 fw-semibold">
                  Total Paid
                </div>
                <div className="fw-bold fs-5">
                  ₹
                  {payments
                    .reduce((s, p) => s + Number(p.amount || 0), 0)
                    .toFixed(2)}
                </div>
              </Card>

              <Card
                className="flex-fill border-0 shadow-sm text-center py-3"
                style={{ borderRadius: "14px", background: "#e8f5e9" }}
              >
                <div className="text-success small mb-1 fw-semibold">
                  Bills Generated
                </div>
                <div className="fw-bold fs-5">{generatedBillsList.length}</div>
              </Card>
            </div>
          </div>
        </Card.Body>
      </Card>
    </Col>
  </Row>

  {/* Move-ins / Move-outs */}
<Row className="g-4 mb-4">
  {/* Recent Move-ins */}
  <Col xs={12} md={6}>
    <Card className="border-0 shadow-sm h-100" style={{ minHeight: 220, borderRadius: 12 }}>
      <div
        className="px-4 py-2 text-white d-flex align-items-center justify-content-between"
        style={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, background: "linear-gradient(90deg, #92758eff, #935e8fff)" }}
      >
        <div className="fw-bold">Recent Move-ins</div>
        <small className="text-white-50">{recentMoveIns.length} new</small>
      </div>

      <Card.Body className="p-3">
        {recentMoveIns.length ? (
          <div className="list-group">
            {recentMoveIns.map((t) => (
              <div
                key={t._id}
                className="list-group-item list-group-item-action d-flex gap-3 align-items-center"
                style={{ cursor: "pointer", borderRadius: 10 }}
                onClick={() => {
                  /* optional: navigate to tenant detail */
                }}
              >
                {/* avatar / initials */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: "#eef2ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    color: "#0d6efd",
                    flexShrink: 0,
                  }}
                >
                  {(t.fullName || t.name || "U").split(" ").map((s) => s[0]).slice(0,2).join("")}
                </div>

                {/* content */}
                <div className="flex-fill">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="fw-bold">{t.fullName || t.name}</div>
                      <div className="small text-muted">
                        {t.room?.number || t.roomId || "-"}
                      </div>
                    </div>

                    <div className="text-end">
                      <div>
                        <span className="badge bg-light text-dark" style={{ fontSize: 12 }}>
                          {shortDate(t.moveInDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* optional subtitle */}
                  {t.phone && <div className="small text-muted mt-1">{t.phone}</div>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-5 text-muted">
            <div className="mb-2">No recent move-ins</div>
            <small>Move-ins will appear here when tenants are added</small>
          </div>
        )}
      </Card.Body>

      <div className="px-3 pb-3 d-flex justify-content-end">
        <Button variant="link" size="sm">View all</Button>
      </div>
    </Card>
  </Col>

  {/* Recent Move-outs */}
  <Col xs={12} md={6}>
    <Card className="border-0 shadow-sm h-100" style={{ minHeight: 220, borderRadius: 12 }}>
      <div
        className="px-4 py-2 d-flex align-items-center justify-content-between"
        style={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, background: "linear-gradient(90deg, #b49994ff, #ac7169ff)" }}
      >
        <div className="fw-bold text-white">Recent Move-outs</div>
        <small className="text-white-50">{recentMoveOuts.length} recent</small>
      </div>

      <Card.Body className="p-3">
        {recentMoveOuts.length ? (
          <div className="list-group">
            {recentMoveOuts.map((t) => (
              <div
                key={t._id}
                className="list-group-item list-group-item-action d-flex gap-3 align-items-center"
                style={{ cursor: "pointer", borderRadius: 10 }}
                onClick={() => {
                  /* optional: navigate to tenant detail */
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: "#e8f5e9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    color: "#198754",
                    flexShrink: 0,
                  }}
                >
                  {(t.fullName || t.name || "U").split(" ").map((s) => s[0]).slice(0,2).join("")}
                </div>

                <div className="flex-fill">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="fw-bold">{t.fullName || t.name}</div>
                      <div className="small text-muted">{t.room?.number || t.roomId || "-"}</div>
                    </div>

                    <div className="text-end">
                      <span className="badge bg-light text-dark" style={{ fontSize: 12 }}>
                        {shortDate(t.moveOutDate)}
                      </span>
                    </div>
                  </div>

                  {t.notes && <div className="small text-muted mt-1">{t.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-5 text-muted">
            <div className="mb-2">No recent move-outs</div>
            <small>Move-outs will appear here when tenants leave</small>
          </div>
        )}
      </Card.Body>

      <div className="px-3 pb-3 d-flex justify-content-end">
        <Button variant="link" size="sm">View all</Button>
      </div>
    </Card>
  </Col>
</Row>
</Container>

  </div>
</>

  );
}
