import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Container, Card, Button, Spinner, Row, Col, Alert } from "react-bootstrap";
import { CreditCard, FileText, CheckCircle, XCircle, ArrowLeftCircle, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import BillService from "../services/BillService";

/**
 * Public tenant payment page.
 * Route: /payment/public/:billId   (or /payment/:billId if you prefer)
 *
 * Behavior:
 *  - Calls createPaymentOrderForBillPublic(billId) to obtain an orderId and Razorpay key.
 *  - Shows amount and Pay button.
 *  - Opens Razorpay checkout. On success calls markPaidPublic to persist payment.
 *  - Allows downloading the bill PDF via existing public endpoint.
 */

export default function TenantPayment() {
  const { billId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);         // while fetching order info
  const [processing, setProcessing] = useState(false);  // while opening/handling payment
  const [orderInfo, setOrderInfo] = useState(null);     // { orderId, razorpayKeyId, amount }
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);         // success message & payment details
  const [countdown, setCountdown] = useState(120);


  useEffect(() => {
    async function init() {
      setLoading(true);
      setError(null);
      try {
        // Create an order for this bill (public endpoint)
        const resp = await BillService.createPaymentOrderForBillPublic(billId);
        // resp expected: { orderId, razorpayKeyId, amount }
        setOrderInfo(resp);
      } catch (err) {
        console.error("createOrderPublic error", err);
        setError(err.response?.data?.message || err.message || "Failed to initialize payment.");
      } finally {
        setLoading(false);
      }
    }

    if (!billId) {
      setError("No bill specified.");
      setLoading(false);
      return;
    }

    init();
  }, [billId]);

useEffect(() => {
  if (orderInfo && !success && !processing) {
    const timer = setTimeout(() => {
      openRazorpay();
    }, 800); // small delay for better UX
    return () => clearTimeout(timer);
  }
}, [orderInfo]);

useEffect(() => {
  if (success) {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }
}, [success, navigate]);


  async function handleDownloadPdf() {
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
      console.error("Download PDF failed", err);
      setError("Failed to download PDF. Try again later.");
    }
  }

  async function openRazorpay() {
    if (!orderInfo) {
      setError("Payment info not available.");
      return;
    }

    setProcessing(true);
    setError(null);

    const { orderId, razorpayKeyId, amount } = orderInfo;
    const amountPaise = Math.round(Number(amount || 0) * 100);

    // Basic checkout options
    const options = {
      key: razorpayKeyId || process.env.REACT_APP_RAZORPAY_KEY || window.RAZORPAY_KEY,
      amount: amountPaise,
      currency: "INR",
      name: "Rent Payment",
      description: `Payment for bill ${billId}`,
      order_id: orderId,
      handler: async function (response) {
        // response contains razorpay_payment_id, razorpay_order_id, razorpay_signature
        try {
          // Call public mark-paid endpoint to record
          await BillService.markPaidPublic(billId, {
            paymentRef: response.razorpay_payment_id,
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            paidAt: new Date().toISOString(),
            method: "razorpay",
          });

          setSuccess({
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            amount,
          });

          // Optionally navigate back to tenant bills or show link
        } catch (err) {
          console.error("markPaidPublic failed", err);
          setError("Payment succeeded but server update failed. Contact admin.");
        } finally {
          setProcessing(false);
        }
      },
      modal: {
        ondismiss: function () {
          setProcessing(false);
        },
      },
      prefill: {
        // you could optionally prefill if you had tenant info in location.state
        name: location.state?.tenantName || "",
        contact: location.state?.tenantPhone || "",
        email: location.state?.tenantEmail || "",
      },
      theme: {
        color: "#3399cc",
      },
    };

    try {
      // Ensure Razorpay script is available
      if (typeof window.Razorpay === "undefined") {
        // Dynamically load script
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = resolve;
          script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
          document.body.appendChild(script);
        });
      }

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Failed to open checkout", err);
      setError(err.message || "Failed to open payment gateway.");
      setProcessing(false);
    }
  }

  return (
    <div style={{ background: "#f4f7fb", minHeight: "100vh", paddingTop: 60 }}>
      <Container className="py-5">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="link" onClick={() => navigate(-1)} className="mb-3">
            <ArrowLeftCircle size={18} className="me-1" /> Back
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="mx-auto shadow-sm" style={{ maxWidth: 720 }}>
            <Card.Body>
              <Row>
                <Col md={7}>
                  <h4 className="fw-bold mb-2">
                    <CreditCard size={18} className="me-2" />
                    Pay Rent — Bill {billId}
                  </h4>
                  <p className="text-muted mb-3">
                    Secure payment powered by Razorpay. No login required — this is a
                    tenant payment page.
                  </p>

                  {loading && (
                    <div className="py-3">
                      <Spinner animation="border" size="sm" className="me-2" />
                      Initializing payment...
                    </div>
                  )}

                  {error && <Alert variant="danger">{error}</Alert>}

                  {!loading && orderInfo && !success && (
                    <>
                      <p className="mb-1 text-muted">Amount to pay</p>
                      <h2 className="fw-bold">
                        ₹{Number(orderInfo.amount).toFixed(2)}
                      </h2>

                      <div className="mt-3 d-flex gap-2">
                        <Button
                          variant="success"
                          onClick={openRazorpay}
                          disabled={processing}
                        >
                          {processing ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-2" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CreditCard size={14} className="me-1" /> Pay Now
                            </>
                          )}
                        </Button>

                        <Button variant="outline-secondary" onClick={handleDownloadPdf}>
                          <FileText size={14} className="me-1" /> Download Bill
                        </Button>
                      </div>
                    </>
                  )}

                  {success && (
                    <div className="mt-3">
                      <Alert variant="success">
                        <div className="d-flex align-items-start">
                          <CheckCircle size={20} className="me-2 mt-1" />
                          <div>
                            <strong>Payment recorded successfully.</strong>
                            <div>Payment ID: {success.paymentId}</div>
                            <div>Order ID: {success.orderId}</div>
                            <div>Reference ID: {success.paymentId}</div>
                            <div>Paid Date: {new Date().toLocaleString()}</div>
                          </div>
                        </div>
                      </Alert>
                      <p className="mt-3 text-muted small">
                        Redirecting to home in {countdown} seconds...
                        </p>
                      <div className="d-flex gap-2">
                        <Button variant="outline-primary" onClick={handleDownloadPdf}>
                          <FileText size={14} className="me-1" /> Download Paid Bill
                        </Button>
                        <Button variant="secondary" onClick={() => navigate("/")}>
                          Back to Home
                        </Button>
                      </div>
                    </div>
                  )}
                </Col>

                <Col md={5} className="border-start d-flex flex-column justify-content-center align-items-center">
                    <ShieldCheck size={80} color="#3399cc" strokeWidth={1.5} />
                    <p className="small text-muted mt-3 text-center">
                    Secure checkout — your card/UPI details are processed by Razorpay.

                  </p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </motion.div>
      </Container>
    </div>
  );
}
