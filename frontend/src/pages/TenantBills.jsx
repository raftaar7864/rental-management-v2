import React, { useState } from "react";
import { Container, Form, Button, Card, Spinner, Row, Col, Badge } from "react-bootstrap";
import BillService from "../services/BillService";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  CreditCard,
  Search,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Home,
  Building2,
  Receipt,
} from "lucide-react";

export default function TenantBills() {
  const [tenantId, setTenantId] = useState("");
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [currentBill, setCurrentBill] = useState(null);

  async function fetchBills() {
    //if (!tenantId.trim()) return alert("Please enter your Tenant ID (e.g. T001 or 001)");
    setLoading(true);
    setSearched(true);
    setCurrentBill(null);
    try {
      // ✅ Normalize tenant ID (allow "T001" or "001")
      let normalizedId = tenantId.trim().toUpperCase();
      if (!normalizedId.startsWith("T")) {
        normalizedId = `T${normalizedId}`;
      }

      const params = { tenantId: normalizedId };
      const res = await BillService.getBillsPublic(params);

      if (res && res.length > 0) {
        const sorted = [...res].sort(
          (a, b) => new Date(b.billingMonth) - new Date(a.billingMonth)
        );
        setBills(sorted);
        setCurrentBill(sorted[0]);
      } else {
        setBills([]);
        setCurrentBill(null);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to fetch bills");
    } finally {
      setLoading(false);
    }
  }


  async function downloadPdf(billId) {
    try {
      const blob = await BillService.getBillPdf(billId);
      const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `bill_${billId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to download PDF");
    }
  }


  const navigate = useNavigate();
  return (
    <div style={{ background: "#f4f7fb", minHeight: "100vh", paddingTop: "60px" }}>
      <Container className="pb-5 text-center">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-4"
        >
         <img
            src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExcW9xZHp5aHozb3BrMm1tY2w2bzVzNG1lc2E4ZGs2d21meWVjNHQyNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/L2BSJXbYiZlXSUKQGY/giphy.gif"
            alt="Tenant Dashboard"
            style={{ width: 100, marginBottom: 10 }}
          /> 
          <h2 className="fw-bold text-primary">
            <Home size={24} className="me-2" />
            Tenant Billing Portal
          </h2>
          <p className="text-muted mb-0">
            Enter your Tenant ID to view your bills and payment history.
          </p>
        </motion.div>

        {/* Search Row */}
        <motion.div
          className="mx-auto mb-4"
          style={{ maxWidth: 500 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-3 shadow-sm border-0 rounded-4">
            <Form
              onSubmit={(e) => {
                e.preventDefault();
                fetchBills();
              }}
            >
              <Row className="align-items-center">
                <Col xs={8} sm={9}>
                  <Form.Control
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    placeholder="Enter Tenant ID (e.g. T0001 or 0001)"
                    className="rounded-3 text-left"
                    style={{
                      fontSize: "1.05rem",
                      letterSpacing: "0.5px",
                      height: "45px",
                    }}
                  />
                </Col>
                <Col xs={4} sm={3}>
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-100 fw-semibold rounded-3"
                    disabled={loading}
                    style={{ height: "45px" }}
                  >
                    {loading ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <Search size={18} />
                    )}
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card>
        </motion.div>

        {/* Results */}
        <AnimatePresence>
          {searched && !loading && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Current Bill */}
              {currentBill ? (
                <Card
                  className="shadow-lg border-0 rounded-4 p-4 text-start mx-auto"
                  style={{ maxWidth: 700, background: "#ffffff" }}
                >
                  <Row>
                    <Col sm={8}>
                      <h5 className="fw-bold text-primary mb-1">
                        <Receipt size={18} className="me-2" />
                        Current Bill -{" "}
                        {new Date(currentBill.billingMonth).toLocaleString("default", {
                          month: "long",
                          year: "numeric",
                        })}
                      </h5>
                      <p className="text-muted mb-1">
                        <Building2 size={14} className="me-1" />
                        {currentBill.building?.name || "Building"} — Room{" "}
                        {currentBill.room?.number || "N/A"}
                      </p>
                        <p className="text-muted mb-2">
                          <User size={14} className="me-1" />
                          {currentBill.tenant?.fullName ||
                            currentBill.tenantName ||
                            "Tenant Name Not Available"}
                        </p>
                        <p className="text-muted mb-2">
                          <Badge bg="secondary">
                            ID: {currentBill.tenant?.tenantId || tenantId || "N/A"}
                          </Badge>
                        </p>
                          {currentBill.paymentStatus === "Paid" && (
                            <>
                              <p className="text-muted mb-1">
                                <strong>Paid Date:</strong>{" "}
                                {currentBill.payment?.paidAt
                                  ? new Date(currentBill.payment.paidAt).toLocaleString()
                                  : "N/A"}
                              </p>
                              <p className="text-muted mb-2">
                                <strong>Reference ID:</strong>{" "}
                                {currentBill.payment?.reference || currentBill.paymentRef || "N/A"}
                              </p>
                            </>
                          )}


                    </Col>
                    <Col
                      sm={4}
                      className="d-flex flex-column align-items-end justify-content-between text-end"
                    >
                      <div>
                        <h4 className="fw-bold text-dark mb-1">
                          ₹{Number(currentBill.totalAmount).toFixed(0)}
                        </h4>
                        <Badge
                          bg={currentBill.paymentStatus === "Paid" ? "success" : "warning"}
                          className="mb-2"
                        >
                          {currentBill.paymentStatus || "Pending"}
                        </Badge>

                        {/* ✅ Paid Date and Reference ID (only if available) */}
                        {currentBill.paymentStatus === "Paid" && (
                          <>
                            {currentBill.paidDate && (
                              <p className="text-muted mb-1" style={{ fontSize: "0.85rem" }}>
                                Paid on: {new Date(currentBill.paidDate).toLocaleDateString()}
                              </p>
                            )}
                            {currentBill.referenceId && (
                              <p className="text-muted mb-2" style={{ fontSize: "0.85rem" }}>
                                Ref ID: {currentBill.referenceId}
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      {/* ✅ Action Buttons - PDF on left, Pay Now on right */}
                      <div className="d-flex justify-content-end mt-2">
                        <Button
                          variant="outline-secondary"
                          className="me-2"
                          onClick={() => downloadPdf(currentBill._id)}
                        >
                          <FileText size={16} className="me-1" /> PDF
                        </Button>

                        {currentBill.paymentStatus !== "Paid" && (
                          <Button
                            variant="success"
                            onClick={() => navigate(`/payment/public/${currentBill._id}`)}
                          >
                            <CreditCard size={16} className="me-1" /> Pay Now
                          </Button>
                        )}
                      </div>
                    </Col>

                    </Row>
                </Card>
              ) : (
                <p className="text-muted">No current bill found.</p>
              )}

              {/* Previous Bills */}
              {bills.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-5 text-start mx-auto"
                  style={{ maxWidth: 700 }}
                >
                  <h5 className="text-primary fw-bold mb-3">
                    <Clock size={18} className="me-2" /> Previous Payment History
                  </h5>
                  {bills.slice(1).map((bill) => (
                    <Card
                      key={bill._id}
                      className="shadow-sm border-0 p-3 mb-3 rounded-3 hover-shadow"
                      style={{
                        borderLeft: `5px solid ${
                          bill.paymentStatus === "Paid" ? "#28a745" : "#ffc107"
                        }`,
                        transition: "transform 0.2s ease, box-shadow 0.2s ease",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.transform = "scale(1.02)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.transform = "scale(1)")
                      }
                    >
                      <Row>
                        <Col sm={8}>
                          <strong>
                            {new Date(bill.billingMonth).toLocaleString("default", {
                              month: "long",
                              year: "numeric",
                            })}
                          </strong>
                          <p className="text-muted mb-1">
                            {bill.building?.name || "Building"} — Room{" "}
                            {bill.room?.number || "N/A"}
                          </p>
                                                  <p className="text-muted mb-2">
                          <User size={14} className="me-1" />
                          {currentBill.tenant?.fullName ||
                            currentBill.tenantName ||
                            "Tenant Name Not Available"}
                          <Badge bg="secondary">
                            ID: {currentBill.tenant?.tenantId || tenantId || "N/A"}
                          </Badge>
                        </p>
                          <p className="mb-0">
                            ₹{Number(bill.totalAmount).toFixed(0)} —{" "}
                            {bill.paymentStatus === "Paid" ? (
                              <CheckCircle size={15} color="green" className="me-1" />
                            ) : (
                              <XCircle size={15} color="orange" className="me-1" />
                            )}
                            <strong>{bill.paymentStatus || "Pending"}</strong>
                          </p>
                          {bill.paymentStatus === "Paid" && (
                            <small className="text-muted d-block mt-1">
                              Paid:{" "}
                              {bill.payment?.paidAt
                                ? new Date(bill.payment.paidAt).toLocaleString()
                                : "N/A"}{" "}
                              | Ref: {bill.payment?.reference || bill.paymentRef || "N/A"}
                            </small>
                          )}

                        </Col>
                        <Col
                          sm={4}
                          className="d-flex justify-content-end align-items-center"
                        >
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => downloadPdf(bill._id)}
                          >
                            <FileText size={14} className="me-1" /> PDF
                          </Button>
                        </Col>
                      </Row>
                    </Card>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Container>
    </div>
  );
}
