// frontend/src/pages/GenerateBill.jsx
import React, { useEffect, useState, useRef, useContext } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Form,
  Modal,
  Spinner,
  Badge,
  ButtonGroup,
} from "react-bootstrap";
import { AuthContext } from "../context/AuthContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as BuildingService from "../services/BuildingService";
import * as RoomService from "../services/RoomService";
import BillService from "../services/BillService";
import { motion } from "framer-motion";
import { House, Mouse, User, FileText, Trash, Eye, Edit2, Wallet, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../assets/GenerateBill.css";

/* -------------------------
   Utilities
   ------------------------- */
function safeData(res) {
  if (res === undefined || res === null) return null;
  if (res && typeof res === "object" && "data" in res) return res.data;
  return res;
}
function formatCurrency(n) {
  return `₹${Number(n || 0).toFixed(0)}`;
}
function yyyyMmFromDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function monthStartFromYYYYMM(yyyyMm) {
  const [y, m] = (yyyyMm || "").split("-").map(Number);
  if (!y || !m) return null;
  return new Date(y, m - 1, 1, 0, 0, 0, 0);
}
function monthEndFromYYYYMM(yyyyMm) {
  const s = monthStartFromYYYYMM(yyyyMm);
  if (!s) return null;
  return new Date(s.getFullYear(), s.getMonth() + 1, 0, 23, 59, 59, 999);
}
function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
function computeProratedRentForTenant(tenant, monthStart, monthEnd, roomRentFallback = 0) {
  if (!tenant) return 0;
  const moveIn = tenant.moveInDate ? new Date(tenant.moveInDate) : null;
  const moveOut = tenant.moveOutDate ? new Date(tenant.moveOutDate) : null;
  const tenantMonthlyRent = Number(tenant.rentAmount ?? 0) || Number(roomRentFallback || 0);
  const occupiedStart = moveIn && moveIn > monthStart ? moveIn : monthStart;
  const occupiedEnd = moveOut && moveOut < monthEnd ? moveOut : monthEnd;
  if ((moveIn && moveIn > monthEnd) || (moveOut && moveOut < monthStart)) return 0;
  const startUTC = Date.UTC(occupiedStart.getFullYear(), occupiedStart.getMonth(), occupiedStart.getDate());
  const endUTC = Date.UTC(occupiedEnd.getFullYear(), occupiedEnd.getMonth(), occupiedEnd.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  const elapsedDays = Math.floor((endUTC - startUTC) / msPerDay) + 1;
  const totalDays = daysInMonth(monthStart);
  if (elapsedDays <= 0 || totalDays <= 0) return 0;
  return Math.round((tenantMonthlyRent * elapsedDays) / totalDays);
}

/* -------------------------
   Component
   ------------------------- */
export default function GenerateBill() {
  // buildings, selection, month
  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const STORAGE_KEY = "generateBill_selectedMonth";

  // default to previous month
  const now = new Date();
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const defaultMonth = localStorage.getItem(STORAGE_KEY) || yyyyMmFromDate(prevMonthDate);
  const [selectedMonth, setSelectedMonthState] = useState(defaultMonth);
  function setSelectedMonth(v) {
    localStorage.setItem(STORAGE_KEY, v);
    setSelectedMonthState(v);
  }

  // rooms/bills
  const [rooms, setRooms] = useState([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // filter type: all | generated | not-generated
  const [filterType, setFilterType] = useState("all");

  // modal & form state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("edit"); // edit | view
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentRoomActiveTenants, setCurrentRoomActiveTenants] = useState([]);
  const [selectedTenantForModal, setSelectedTenantForModal] = useState(null);
  const [electricity, setElectricity] = useState(0);
  const [additionalAmount, setAdditionalAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [includeProcessing, setIncludeProcessing] = useState(true);
  const [notes, setNotes] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentBill, setCurrentBill] = useState(null);

  const prevValidMonth = useRef(selectedMonth);
  const { user } = useContext(AuthContext);

  // load buildings (filtered by role)
  useEffect(() => {
    (async () => {
      setLoadingBuildings(true);
      try {
        // 1️⃣ Get current user
        let user = null;
        const storedUser = localStorage.getItem("user");
        if (storedUser) user = JSON.parse(storedUser);

        // 2️⃣ Fetch all buildings
        const getFn = BuildingService.getBuildings ?? BuildingService.getAllBuildings;
        const res = await getFn();
        const data = res?.data || [];
        const allBuildings = Array.isArray(data) ? data : data?.data ?? [];

        // 3️⃣ Filter for manager
        let filteredBuildings = allBuildings;
        if (user && user.role?.toLowerCase() === "manager") {
          if (Array.isArray(user.building)) {
            // manager has multiple buildings
            filteredBuildings = allBuildings.filter(b => user.building.includes(b._id));
          } else if (user.building?._id) {
            // manager has one building object
            filteredBuildings = allBuildings.filter(b => b._id === user.building._id);
          } else if (typeof user.building === "string") {
            // manager has one building ID string
            filteredBuildings = allBuildings.filter(b => b._id === user.building);
          }
        }

        // 4️⃣ Set buildings
        setBuildings(filteredBuildings || []);

        // 5️⃣ Auto-select first
        if (!selectedBuilding && filteredBuildings.length > 0) {
          setSelectedBuilding(filteredBuildings[0]._id);
        }
      } catch (err) {
        console.error("loadBuildings error:", err);
        toast.error("Failed to load buildings");
        setBuildings([]);
      } finally {
        setLoadingBuildings(false);
      }
    })();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!selectedBuilding) return;
    if (!canGenerateForMonth(selectedMonth)) {
      toast.error("You can only generate bills for completed months (strictly before current month).");
      const prev = prevValidMonth.current || defaultMonth;
      setSelectedMonth(prev);
      return;
    }
    prevValidMonth.current = selectedMonth;
    fetchRoomsForMonth(selectedBuilding, selectedMonth);
    // eslint-disable-next-line
  }, [selectedBuilding, selectedMonth]);

  function canGenerateForMonth(yyyyMm) {
    const selStart = monthStartFromYYYYMM(yyyyMm);
    if (!selStart) return false;
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return selStart < currentMonthStart;
  }

  function tenantActiveInMonth(tenant, monthStart, monthEnd) {
    if (!tenant) return false;
    const moveIn = tenant.moveInDate ? new Date(tenant.moveInDate) : null;
    const moveOut = tenant.moveOutDate ? new Date(tenant.moveOutDate) : null;
    if (moveIn && moveIn > monthEnd) return false;
    if (moveOut && moveOut < monthStart) return false;
    return true;
  }

  // fetch rooms and bills
  const fetchRoomsForMonth = async (buildingId, yyyyMm) => {
    try {
      setLoadingRooms(true);
      const getRoomsFn = RoomService.getRoomsByBuilding ?? RoomService.getRoom;
      const resRooms = await getRoomsFn(buildingId);
      const roomsData = safeData(resRooms) || [];

      const monthStart = monthStartFromYYYYMM(yyyyMm);
      const monthEnd = monthEndFromYYYYMM(yyyyMm);
      const billsResp = await BillService.getBills({ month: yyyyMm });
      const bills = safeData(billsResp) || [];

      const roomsWithActive = (Array.isArray(roomsData) ? roomsData : [])
        .map((r) => {
          const tenants = Array.isArray(r.tenants) ? r.tenants : (Array.isArray(r.tenant) ? r.tenant : []);
          const activeTenants = tenants.filter((t) => tenantActiveInMonth(t, monthStart, monthEnd));

          const normalizedRent = Number(r.rent ?? r.rentAmount ?? r.monthlyRent ?? r.baseRent ?? r.price ?? 0);
          const activeTenantsWithProrate = activeTenants.map((t) => ({
            ...t,
            proratedRent: computeProratedRentForTenant(t, monthStart, monthEnd, normalizedRent),
          }));

          const bill = (Array.isArray(bills) ? bills : []).find((b) => {
            try {
              const bRoom = b.room?._id || b.room;
              const bMonthStr = b.billingMonth ? (typeof b.billingMonth === "string" ? b.billingMonth.slice(0,7) : new Date(b.billingMonth).toISOString().slice(0,7)) : "";
              return String(bRoom) === String(r._id) && bMonthStr === yyyyMm;
            } catch {
              return false;
            }
          });

          let totalAmt = 0;
          if (bill) {
            const chargesObj = {};
            (bill.charges || []).forEach((c) => {
              if (c.title && c.amount != null) chargesObj[c.title.toLowerCase()] = c.amount;
            });
            const rent = activeTenantsWithProrate[0]?.proratedRent || normalizedRent;
            const electricityAmt = Number(chargesObj["electricity"] || 0);
            const additionalAmt = Number(chargesObj["additional amount"] || bill?.totals?.additionalAmount || 0);
            const discountAmt = Number(chargesObj["discount"] || 0);
            const processingFee = Number(chargesObj["processing fee"] || chargesObj["processing fee 2%"] || 0);
            totalAmt = Math.round(rent + electricityAmt + additionalAmt - discountAmt + processingFee);
          }

          return {
            ...r,
            rent: normalizedRent,
            tenants,
            activeTenants: activeTenantsWithProrate,
            billStatus: bill ? "Generated" : "Not Generated",
            paymentStatus: bill?.paymentStatus === "Paid" || bill?.paymentStatus === "paid" || bill?.status === "paid" ? "Paid" : bill?.paymentStatus || bill?.status || "Not Paid",
            billId: bill?._id || null,
            bill,
            tableTotal: totalAmt,
          };
        })
        .filter((r) => Array.isArray(r.activeTenants) && r.activeTenants.length > 0);

      setRooms(roomsWithActive);
    } catch (err) {
      console.error("fetchRoomsForMonth", err);
      toast.error("Failed to load rooms or bills");
      setRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  };

  // open modal
  const openBillModal = async (room, mode = "edit") => {
    setModalMode(mode);
    setCurrentRoom(room);
    setCurrentRoomActiveTenants(room.activeTenants || []);
    setSelectedTenantForModal(room.activeTenants?.[0] || null);
    setElectricity(0);
    setAdditionalAmount(0);
    setDiscount(0);
    setIncludeProcessing(true);
    setNotes("");
    setPaymentLink("");
    setCurrentBill(null);
    setShowModal(true);

    if (room.billId) {
      try {
        setActionLoading(true);
        const billResp = await BillService.getBill(room.billId);
        const b = safeData(billResp) || billResp;
        setCurrentBill(b);

        const tenantId = b?.tenant?._id || b?.tenant;
        const matched = (room.activeTenants || []).find((t) => String(t._id) === String(tenantId));
        if (matched) setSelectedTenantForModal(matched);

        const chargesObj = {};
        (b.charges || []).forEach((c) => {
          if (c.title && c.amount != null) chargesObj[c.title.toLowerCase()] = c.amount;
        });

        setElectricity(Number(chargesObj["electricity"] || 0));
        setDiscount(-Number(chargesObj["discount"] || 0));
        setAdditionalAmount(Number(chargesObj["additional amount"] || b?.totals?.additionalAmount || 0));
        setIncludeProcessing(!!(chargesObj["processing fee"] || chargesObj["processing fee 2%"]));

        setNotes(b?.notes || "");
        setPaymentLink(b?.paymentLink || "");
      } catch (err) {
        console.error("openBillModal", err);
        toast.error("Failed to load bill details");
      } finally {
        setActionLoading(false);
      }
    }
  };

  const navigate = useNavigate();

  // helpers
  const getTenantRent = () =>
    Number(selectedTenantForModal?.proratedRent ?? selectedTenantForModal?.rentAmount ?? currentRoom?.rent ?? 0);
  const getProcessingFee = (rent) => (includeProcessing ? Math.round(Number(rent) * 0.02) : 0);
  const getTotal = () => {
    if (!currentRoom || !selectedTenantForModal) return 0;
    const rent = getTenantRent();
    const fee = getProcessingFee(rent);
    return Math.round(rent + Number(electricity || 0) + Number(additionalAmount || 0) - Number(discount || 0) + fee);
  };

  // save/generate
  const handleSaveOrGenerate = async () => {
    if (!currentRoom || !selectedTenantForModal) {
      toast.error("Select a tenant to bill");
      return;
    }

    try {
      setSaving(true);

      const rent = getTenantRent();
      const electricityAmt = Number(electricity || 0);
      const additionalAmt = Number(additionalAmount || 0);
      const discountAmt = Number(discount || 0);
      const processingFee = includeProcessing ? Math.round(rent * 0.02) : 0;

      const totalAmount = Math.round(rent + electricityAmt + additionalAmt - discountAmt + processingFee);

      if (!totalAmount || totalAmount <= 0) {
        toast.error("Total amount must be greater than zero");
        setSaving(false);
        return;
      }

      const charges = [
        { title: "Rent", amount: rent },
        ...(electricityAmt !== 0 ? [{ title: "Electricity", amount: electricityAmt }] : []),
        ...(additionalAmt !== 0 ? [{ title: "Additional Amount", amount: additionalAmt }] : []),
        ...(discountAmt !== 0 ? [{ title: "Discount", amount: -discountAmt }] : []),
        ...(processingFee !== 0 ? [{ title: "Processing Fee 2%", amount: processingFee }] : []),
      ];

      const totals = {
        rent,
        electricity: electricityAmt,
        processingFee,
        additionalAmount: additionalAmt,
        discount: discountAmt,
      };

      const payload = {
        room: currentRoom._id,
        tenant: selectedTenantForModal._id,
        billingMonth: selectedMonth + "-01",
        totalAmount,
        charges,
        totals,
        notes: notes || undefined,
        paymentLink: paymentLink || undefined,
      };

      let saved = null;
      if (currentBill && currentBill._id) {
        const resp = await BillService.updateBill(currentBill._id, payload);
        saved = safeData(resp) || resp;
        toast.success("Bill updated");
      } else {
        const resp = await BillService.createBill(payload);
        saved = safeData(resp) || resp;
        toast.success("Bill created");
      }

      // refresh and set current bill
      await fetchRoomsForMonth(selectedBuilding, selectedMonth);
      if (saved) setCurrentBill(saved);
      setShowModal(false);
    } catch (err) {
      console.error("handleSaveOrGenerate", err);
      toast.error(err?.response?.data?.message || "Failed to save bill");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBill = async (billId) => {
    if (!window.confirm("Delete bill?")) return;
    try {
      await BillService.deleteBill(billId);
      toast.success("Bill deleted");
      fetchRoomsForMonth(selectedBuilding, selectedMonth);
    } catch (err) {
      console.error("handleDeleteBill", err);
      toast.error("Failed to delete");
    }
  };

  const handleDownloadPdf = async (billId) => {
    try {
      setActionLoading(true);
      const blob = await BillService.getBillPdf(billId);
      const file = blob instanceof Blob ? blob : new Blob([blob], { type: "application/pdf" });
      const url = window.URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bill_${billId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error("handleDownloadPdf", err);
      toast.error("Failed to download PDF");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResend = async (billId) => {
    try {
      setActionLoading(true);
      await BillService.resendBill(billId);
      toast.success("Notifications resent (email/WhatsApp) if configured");
    } catch (err) {
      console.error("handleResend", err);
      toast.error("Failed to resend");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateOrderAndOpenCheckout = async (bill) => {
    try {
      setActionLoading(true);
      const resp = await BillService.createPaymentOrderForBill(bill._id);
      const data = safeData(resp) || resp;
      const { orderId, razorpayKeyId, amount } = data || {};

      if (!orderId) {
        toast.error("Payment provider not configured or order creation failed.");
        return;
      }

      if (!window.Razorpay) {
        if (bill.paymentLink) {
          window.open(bill.paymentLink, "_blank");
          return;
        }
        toast.error("Razorpay checkout is not loaded. Include checkout script in index.html");
        return;
      }

      const options = {
        key: razorpayKeyId || process.env.REACT_APP_RAZORPAY_KEY_ID || "",
        amount: Math.round(Number(amount) * 100),
        currency: "INR",
        name: "Rent Payment",
        description: `Payment for bill ${bill._id}`,
        order_id: orderId,
        handler: async function (response) {
          try {
            await BillService.markPaid(bill._id, {
              paymentRef: response.razorpay_payment_id,
              paidAt: new Date().toISOString(),
              method: "razorpay",
            });
            toast.success("Payment successful and recorded.");
            fetchRoomsForMonth(selectedBuilding, selectedMonth);
          } catch (err) {
            console.error("markPaid handler", err);
            toast.error("Payment recorded but server update failed.");
          }
        },
        prefill: {
          name: bill.tenant?.fullName || "",
          email: bill.tenant?.email || "",
          contact: bill.tenant?.phone || "",
        },
        theme: { color: "#3399cc" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("createOrder", err);
      toast.error("Failed to initialize payment");
    } finally {
      setActionLoading(false);
    }
  };

  // derived counts for progress box
  const generatedCount = (rooms || []).filter(r => r.billStatus === "Generated").length;
  const notGeneratedCount = (rooms || []).length - generatedCount;
  const paidCount = (rooms || []).filter(r => r.paymentStatus === "Paid").length;
  const unpaidCount = (rooms || []).length - paidCount;

  // apply filterType to rooms (no other change to card design)
  const filteredRooms = (rooms || []).filter((r) => {
    if (filterType === "all") return true;
    if (filterType === "generated") return r.billStatus === "Generated";
    if (filterType === "not-generated") return r.billStatus !== "Generated";
    return true;
  });

  /* -------------------------
     Render
     ------------------------- */
  return (
    <Container className="py-2">
      <Row className="mb-3">
        <Col>
          <motion.h3 initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            Generate & Manage Monthly Bills
          </motion.h3>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col xs={12}>
          <Card className="p-3 shadow-sm border-0 filter-card" >
            <Card.Body>
              <Row className="g-3 align-items-end">
                
                {/* Select Building */}
                <Col xs={12} md={8} lg={4}>
                  <Form.Group>
                    <Form.Label className="fw-semibold text-secondary">
                      Select Building
                    </Form.Label>
                    {loadingBuildings ? (
                      <div className="d-flex justify-content-center align-items-center p-3">
                        <Spinner animation="border" />
                      </div>
                    ) : (
                      <Form.Select
                        value={selectedBuilding}
                        onChange={(e) => setSelectedBuilding(e.target.value)}
                        className="shadow-sm"
                      >
                        <option value="">-- select building --</option>
                        {Array.isArray(buildings) &&
                          buildings.map((b) => (
                            <option key={b._id || b.id} value={b._id || b.id}>
                              {b.name} {b.address ? `- ${b.address}` : ""}
                            </option>
                          ))}
                      </Form.Select>
                    )}
                  </Form.Group>
                </Col>

                {/* Select Month */}
                <Col xs={12} md={8} lg={4}>
                  <Form.Group>
                    <Form.Label className="fw-semibold text-secondary">
                      Select Month <span className="ms-1 small text-muted">(Only completed months allowed)</span>
                    </Form.Label>
                    <Form.Control
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="shadow-sm"
                    />
                  </Form.Group>
                </Col>

                {/* Actions */}
                <Col xs={12} md={8} lg={4}>
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    
                    {/* Counts */}
                    <div className="d-flex flex-wrap gap-3">
                      <div className="px-3 py-2 bg-light rounded text-center">
                        <div className="small text-muted">Generated</div>
                        <div className="fw-bold text-secondary">{generatedCount}</div>
                      </div>
                      <div className="px-3 py-2 bg-light rounded text-center">
                        <div className="small text-muted">Paid</div>
                        <div className="fw-bold text-success">{paidCount}</div>
                      </div>
                      <div className="px-3 py-2 bg-light rounded text-center">
                        <div className="small text-muted">Unpaid</div>
                        <div className="fw-bold text-danger">{unpaidCount}</div>
                      </div>
                    </div>
                  </div>
                </Col>

              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm">
      <Card.Body>
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <h5 className="mb-0">
            Active Tenants for {selectedMonth ? new Date(monthStartFromYYYYMM(selectedMonth)).toLocaleString(undefined, { month: "long", year: "numeric" }) : "-"}
            <small className="text-muted ms-2">({filteredRooms.length} rooms)</small>
          </h5>
        </div>

        {/* Filter buttons: All / Generated / Not Generated (right-aligned) */}
        <div>
          <ButtonGroup aria-label="Bill filter">
            <Button
              variant={filterType === "all" ? "secondary" : "outline-secondary"}
              onClick={() => setFilterType("all")}
            >
              All
            </Button>
            <Button
              variant={filterType === "generated" ? "secondary" : "outline-secondary"}
              onClick={() => setFilterType("generated")}
            >
              Generated
            </Button>
            <Button
              variant={filterType === "not-generated" ? "secondary" : "outline-secondary"}
              onClick={() => setFilterType("not-generated")}
            >
              Not Generated
            </Button>
            <Button onClick={() => fetchRoomsForMonth(selectedBuilding, selectedMonth)}><RefreshCw size={16} className="me-1" />
            </Button>
          </ButtonGroup>
        </div>
      </div>

          {loadingRooms ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="py-4">
              <p>No active tenants found for the selected month / filter.</p>
            </div>
          ) : (
            <Row className="mt-3">
              {(filteredRooms || []).map((r, idx) => (
                <Col xs={12} md={12} lg={6} key={r._id || r.id} className="mb-3">
                  <Card
                    className={`h-100 room-card ${
                      r.paymentStatus === "Paid" ? "paid" : r.billStatus === "Generated" ? "generated" : "default"
                    }`}
                    onClick={() => openBillModal(r, r.billId ? "view" : "edit")}
                  >
                    {/* Top split: left info, right totals */}
                    <div className="d-flex p-3 align-items-start justify-content-between">
                      <div style={{ flex: 1, paddingRight: 12 }}>
                        <div className="d-flex align-items-center mb-2">
                          <House size={16} className="me-2" />
                            <div className="ribbon-text">Room - {r.number || r.roomNumber || r._id}</div></div>
                            <User size={16} className="me-1" />{(r.activeTenants || []).map((t) => `${t.fullName} (${t.tenantId || t._id})`).join(", ") || "—"}
                        <div className="small text-muted mt-2">{r.billId ? `Ref: ${r.billId}` : "Not generated"}</div>
                      </div>

                      <div style={{ minWidth: 120, textAlign: "right" }}>
                        <div className="room-total">{formatCurrency(r.tableTotal)}</div>

                        {/* Payment status (kept above) */}
                        <div className="mt-2 d-flex justify-content-end gap-1">
                          <Badge bg={r.paymentStatus === "Paid" ? "success" : "secondary"} className="d-flex align-items-center small-badge">
                            <Wallet size={12} className="me-1" />
                            {r.paymentStatus}
                          </Badge>
                        </div>

                        {/* Bill generated status (below payment) */}
                        <div className="mt-2 d-flex justify-content-end gap-1">
                          <Badge bg={r.billStatus === "Generated" ? "success" : "warning"} className="d-flex align-items-center small-badge">
                            <FileText size={12} className="me-1" />
                            {r.billStatus}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <hr />

                    {/* Bottom actions row */}
                    <Card.Body className="p-3 pt-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex flex-wrap gap-2">
                          {!r.billId ? (
                            <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); openBillModal(r, "edit"); }}>
                              <FileText size={14} className="me-1" /> Generate Bill
                            </Button>
                          ) : (
                            <>
                              <Button size="sm" variant="info" onClick={(e) => { e.stopPropagation(); openBillModal(r, "view"); }}>
                                <Eye size={14} className="me-1" /> View Bill
                              </Button>

                              {r.paymentStatus !== "Paid" && (
                                <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); openBillModal(r, "edit"); }}>
                                  <Edit2 size={14} className="me-1" /> Edit Bill
                                </Button>
                              )}

                              {user?.role !== "manager" && (
                                <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDeleteBill(r.billId); }}>
                                <Trash size={14} className="me-1" /> Delete
                              </Button>
                              )}
                            </>
                          )}
                        </div>

                        <div><Mouse size={16} className="me-1" /></div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card.Body>
      </Card>

      {/* Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {modalMode === "edit" ? "Generate / Edit Bill" : "Bill Details"}
            {currentRoom ? <span className="ms-2 text-muted">— {currentRoom.number}</span> : null}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {!currentRoom ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          ) : (
            <Form>
              <Row className="g-3">
                <Col md={6}>
                <Form.Group>
                  <Form.Label>Tenant</Form.Label>
                  <Form.Select
                    value={selectedTenantForModal?._id || ""}
                    onChange={(e) => {
                      const id = e.target.value;
                      const found = (currentRoomActiveTenants || []).find((t) => String(t._id) === String(id));
                      setSelectedTenantForModal(found || null);
                    }}
                    disabled={modalMode === "view"}
                  >
                    <option value="">-- choose tenant --</option>
                    {(currentRoomActiveTenants || []).map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.fullName} ({t.tenantId || t._id})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Tenant ID</Form.Label>
                    <Form.Control type="text" value={selectedTenantForModal?.tenantId || selectedTenantForModal?._id || ""} disabled />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mt-3 g-3">
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Rent</Form.Label>
                    <Form.Control type="number" value={getTenantRent()} disabled />
                  </Form.Group>
                </Col>

                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Electricity</Form.Label>
                    <Form.Control
                      type="number"
                      value={electricity}
                      onChange={(e) => setElectricity(Number(e.target.value || 0))}
                      disabled={modalMode === "view"}
                    />
                    <Form.Text className="text-danger">
                      {electricity < 0 ? "Cannot be negative" : ""}
                    </Form.Text>
                  </Form.Group>
                </Col>

                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Additional Amount</Form.Label>
                    <Form.Control
                      type="number"
                      value={additionalAmount}
                      onChange={(e) => setAdditionalAmount(Number(e.target.value || 0))}
                      disabled={modalMode === "view"}
                    />
                    <Form.Text className="text-muted">Extra maintenance / one-off charges</Form.Text>
                  </Form.Group>
                </Col>

                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Discount</Form.Label>
                    <Form.Control
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value || 0))}
                      disabled={modalMode === "view"}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mt-3 g-3">
                <Col md={6}>
                  <Form.Check
                    type="checkbox"
                    label={`Include Processing Fee (2%) - ${formatCurrency(Math.round(getTenantRent() * 0.02))}`}
                    checked={includeProcessing}
                    onChange={(e) => setIncludeProcessing(e.target.checked)}
                    disabled={modalMode === "view"}
                  />
                </Col>

                <Col md={6} className="text-end">
                  <div className="text-muted">Rent basis: {selectedTenantForModal?.proratedRent ? "Prorated" : (selectedTenantForModal?.rentAmount ? "Tenant Rent" : "Room Rent")}</div>
                  <h3 className="mt-1">
                    Total: <span style={{ color: getTotal() <= 0 ? "red" : "green" }}>{formatCurrency(getTotal())}</span>
                  </h3>
                </Col>
              </Row>

              <Row className="mt-2">
                <Col>
                  <Card className="p-2 bg-light">
                    <div style={{ fontSize: 14 }}>
                      <strong>Breakdown:</strong>{" "}
                      <span style={{ color: "#007bff" }} title="Base rent for tenant">Rent: {formatCurrency(getTenantRent())}</span> &nbsp;|&nbsp;
                      <span style={{ color: "#ffc107" }} title="Electricity charges">Electricity: {formatCurrency(Number(electricity || 0))}</span> &nbsp;|&nbsp;
                      <span style={{ color: "#dc3545" }} title="Extra charges">Additional: {formatCurrency(Number(additionalAmount || 0))}</span> &nbsp;|&nbsp;
                      <span style={{ color: "#6c757d" }} title="Discount applied">Discount: {formatCurrency(Number(discount || 0))}</span> &nbsp;|&nbsp;
                      <span style={{ color: "#6f42c1" }} title="Processing fee (2%)">Processing: {formatCurrency(getProcessingFee(getTenantRent()))}</span>
                    </div>
                  </Card>
                </Col>
              </Row>

              <Row className="mt-3 g-3">
                <Col md={8}>
                  <Form.Group>
                    <Form.Label>Notes (optional)</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={modalMode === "view"}
                    />
                    <Form.Text className="text-muted">Will be included in email/WhatsApp and PDF if provided.</Form.Text>
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Payment Link (optional)</Form.Label>
                    <Form.Control
                      type="text"
                      value={paymentLink}
                      onChange={(e) => setPaymentLink(e.target.value)}
                      disabled={modalMode === "view"}
                      placeholder="https://..."
                    />
                    <Form.Text className="text-muted">Paste a direct payment link (overrides gateway popup).</Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              {/* existing bill summary & actions */}
              {currentBill && (
              <Row className="mt-3">
                <Col>
                  <Card>
                    <Card.Body>
                      <Row>
                        <Col><strong>Billing Month</strong></Col>
                        <Col>{currentBill.billingMonth ? new Date(currentBill.billingMonth).toLocaleString(undefined, { month: "long", year: "numeric" }) : "-"}</Col>
                      </Row>

                      <Row className="mt-2">
                        <Col><strong>Status</strong></Col>
                        <Col><Badge bg={currentBill.paymentStatus === "Paid" || currentBill.status === "paid" ? "success" : "secondary"}>{currentBill.paymentStatus || currentBill.status || "pending"}</Badge></Col>
                      </Row>

                      <Row className="mt-2">
                        <Col><strong>Payment Link</strong></Col>
                        <Col>{currentBill.paymentLink ? <a href={currentBill.paymentLink} target="_blank" rel="noreferrer">Open Link</a> : "-"}</Col>
                      </Row>

                      {/* ACTION BUTTONS */}
                      {modalMode !== "edit" && (
                      <Row className="mt-3">
                        <Col>
                          <Button size="sm" variant="outline-primary" className="me-2" onClick={() => handleDownloadPdf(currentBill._id)} disabled={actionLoading}>
                            {actionLoading ? <><Spinner animation="border" size="sm" className="me-2"/>Downloading...</> : "Download PDF"}
                          </Button>

                          <Button size="sm" variant="outline-secondary" className="me-2" onClick={() => handleResend(currentBill._id)} disabled={actionLoading}>
                            {actionLoading ? (<><Spinner animation="border" size="sm" className="me-2"/>Resending...</>) : "Resend (Email/WhatsApp)"}
                          </Button>

                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => navigate(`/payment/${currentBill._id}`)}
                            disabled={actionLoading || currentBill.paymentStatus === "Paid"}
                          >
                            {actionLoading ? <><Spinner animation="border" size="sm" className="me-2"/>Processing...</> : "Pay Now"}
                          </Button>

                        </Col>
                      </Row>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
              )}
            </Form>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving || actionLoading}>Close</Button>

          {modalMode === "edit" && currentBill?.paymentStatus !== "Paid" && (
            <Button variant="primary" onClick={handleSaveOrGenerate} disabled={saving}>
              {saving ? (
                <>
                  <Spinner animation="border" size="sm" /> Saving...
                </>
              ) : currentBill && currentBill._id ? "Save Changes" : "Generate Bill"}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
