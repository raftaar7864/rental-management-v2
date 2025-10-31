// frontend/src/pages/PaymentProcessing.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Spinner, Button, Alert, ProgressBar, Badge } from "react-bootstrap";
import BillService from "../services/BillService";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import useWindowSize from "../hooks/useWindowSize"; // helper hook for confetti
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

export default function PaymentProcessing() {
  const { billId } = useParams();
  const { width, height } = useWindowSize();

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(10);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchBill() {
      try {
        setLoading(true);
        const resp = await BillService.getBill(billId);
        const data = resp?.data || resp;
        setBill(data);
        setLoading(false);
      } catch (err) {
        console.error("fetchBill", err);
        setError("Failed to fetch bill details");
        setLoading(false);
      }
    }
    fetchBill();
  }, [billId]);

useEffect(() => {
  if (bill && bill.paymentStatus !== "Paid") {
    // Automatically trigger payment after bill is loaded
    handlePayment();
  }
}, [bill]);


  // Simulate smooth progress bar
    const animateProgress = (target, duration = 600) => {
    const stepTime = 20;
    const totalSteps = duration / stepTime;
    const diff = target - progress;
    let step = 0;
    const interval = setInterval(() => {
        step++;
        setProgress(prev => {
        const next = prev + diff / totalSteps;
        return next > 100 ? 100 : next;  // clamp to 100
        });
        if (step >= totalSteps) clearInterval(interval);
    }, stepTime);
    };


  const handlePayment = async () => {
    if (!bill) return;
    setActionLoading(true);
    animateProgress(20);

    try {
      const resp = await BillService.createPaymentOrderForBill(bill._id);
      const data = resp?.data || resp;
      const { orderId, razorpayKeyId, amount } = data || {};

      if (!orderId) {
        toast.error("Payment provider not configured or order creation failed.");
        setActionLoading(false);
        return;
      }

      if (!window.Razorpay) {
        toast.error("Razorpay checkout script not loaded.");
        setActionLoading(false);
        return;
      }

      animateProgress(20);

      const options = {
        key: razorpayKeyId || process.env.REACT_APP_RAZORPAY_KEY_ID || "",
        amount: Math.round(Number(amount) * 100),
        currency: "INR",
        name: "Rent Payment",
        description: `Payment for bill ${bill._id}`,
        order_id: orderId,
        handler: async function (response) {
          animateProgress(30);
          try {
            await BillService.markPaid(bill._id, {
              paymentRef: response.razorpay_payment_id,
              paidAt: new Date().toISOString(),
              method: "razorpay",
            });
            animateProgress(30);
            toast.success("Payment successful!");
            setSuccess(true);
            setActionLoading(false);
          } catch (err) {
            console.error("markPaid", err);
            toast.error("Payment recorded but server update failed.");
            setActionLoading(false);
          }
        },
        prefill: {
          name: bill.tenant?.fullName || "",
          email: bill.tenant?.email || "",
          contact: bill.tenant?.phone || "",
        },
        theme: { color: "#00b894" },
        modal: { ondismiss: () => setActionLoading(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("handlePayment", err);
      toast.error("Failed to initiate payment.");
      setActionLoading(false);
    }
  };

  const navigate = useNavigate();

    // replace existing handleDownloadSlip with this
    const handleDownloadSlip = async () => {
    if (!bill || !bill._id) {
        toast.error("No bill selected to download.");
        return;
    }

    try {
        setActionLoading(true);
        // BillService.getBillPdf calls axios.get(`${BASE}/${id}/pdf`, { responseType: "blob" })
        const blob = await BillService.getBillPdf(bill._id);

        // Sometimes the service returns an axios response .data or just the blob — handle both
        const fileBlob = blob instanceof Blob ? blob : (blob?.data instanceof Blob ? blob.data : new Blob([blob], { type: "application/pdf" }));

        // Trigger download
        const url = window.URL.createObjectURL(fileBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bill_${bill._id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        toast.success("Download started");
    } catch (err) {
        console.error("handleDownloadSlip error:", err);

        // More helpful error reporting for debugging
        if (err?.response) {
        // axios error with response from server
        console.error("Server responded:", err.response.status, err.response.headers);
        // if server sent JSON, try to read its message (but axios won't parse blob responses here)
        try {
            // If response is JSON (error page), log text
            const reader = new FileReader();
            if (err.response.data && typeof err.response.data === "object") {
            // attempt to convert to text for inspection (when server returned a blob of JSON)
            reader.onload = () => {
                console.error("Error body (text):", reader.result);
            };
            reader.readAsText(err.response.data);
            }
        } catch (readErr) {
            console.error("Could not read error body:", readErr);
        }

        toast.error(`Failed to download slip (server returned ${err.response.status})`);
        } else if (err?.message) {
        toast.error(`Failed to download slip: ${err.message}`);
        } else {
        toast.error("Failed to download slip");
        }

        // fallback if bill.pdfUrl exists — open in new tab (may require auth)
        if (bill.pdfUrl) {
        try {
            window.open(bill.pdfUrl, "_blank");
            toast.info("Opened PDF in new tab (fallback).");
        } catch (openErr) {
            console.error("Fallback open pdfUrl failed:", openErr);
        }
        }
    } finally {
        setActionLoading(false);
    }
    };


  if (loading) return <div className="text-center py-5"><Spinner animation="border" /> Loading Bill...</div>;
  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!bill) return <Alert variant="warning">Bill not found.</Alert>;

  return (
    <div className="d-flex flex-column justify-content-center align-items-center my-5 position-relative">
      <AnimatePresence>
        {success && <Confetti width={width} height={height} recycle={false} numberOfPieces={400} />}
      </AnimatePresence>

      <Card className="p-4 text-center shadow-lg" style={{ maxWidth: 500, width: "100%", borderRadius: 20 }}>
        <motion.h2
            className="text-center mb-4 fw-bold"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
                fontSize: "2rem",
                color: (success || bill.paymentStatus === "Paid") ? "#28a745" : "#0d6efd",
                textShadow: (success || bill.paymentStatus === "Paid")
                ? "0 0 15px rgba(40, 167, 69, 0.6)"
                : "0 0 15px rgba(13, 110, 253, 0.6)",
            }}
            >
            {(success || bill.paymentStatus === "Paid") ? "🎉 Payment Done" : "🌀 Processing Payment"}
        </motion.h2>

        <hr />
        <p><User size={14} className="me-1" /> {bill.tenant?.fullName}</p>
        <p><Badge bg="secondary">ID: {bill.tenant?.tenantId }</Badge></p>
        <p><strong>Room:</strong> {bill.room?.number || bill.room?._id}</p>

        <p><strong>Billing Month:</strong> {new Date(bill.billingMonth).toLocaleString(undefined, { month: "long", year: "numeric" })}</p>
        <h4 className="mb-3 text-primary">Total: ₹{bill.totalAmount}</h4>

        <ProgressBar
          now={progress}
          className="my-3"
          style={{ height: "1rem", borderRadius: 10 }}
          animated
          label={`${Math.round(progress)}%`}
        />

        {!actionLoading && !success && (
          <Button
            variant="success"
            onClick={handlePayment}
            disabled={bill.paymentStatus === "Paid"}
            className="px-4 py-2"
          >
            {bill.paymentStatus === "Paid" ? "Already Paid" : "Pay Now"}
          </Button>
        )}

        {actionLoading && !success && (
          <div className="position-relative mt-4">
            <motion.div
              className="coin-loader"
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.1, 1], rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            >
              💰
            </motion.div>
            <div className="mt-3 fw-semibold">Processing Payment...</div>
            <div className="text-muted">Time remaining: {countdown}s</div>
          </div>
        )}

        {success && (
        <motion.div
            className="mt-4 text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
        >
            <div className="receipt-animation mb-3">
            <motion.div
                className="receipt bg-light shadow-sm p-3 rounded position-relative"
                style={{ width: "200px", margin: "0 auto" }}
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                <div className="fw-bold text-dark">Payment Confirmed</div>
                <div className="small text-success">₹{bill.totalAmount} received</div>
                <div className="coins-drop mt-2">
                {Array.from({ length: 6 }).map((_, i) => (
                    <motion.div
                    key={i}
                    className="coin text-warning"
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: i * 0.2 }}
                    >
                    🪙
                    </motion.div>
                ))}
                </div>
            </motion.div>
            </div>

            <Button variant="primary" onClick={handleDownloadSlip} className="mt-3 mx-1">
            Download Payment Slip
            </Button>

            <Button
            variant="secondary"
            className="mt-3 mx-1"
            onClick={() => navigate("/")}
            >
            Go Back to Home Page
            </Button>
        </motion.div>

        )}

        {bill.paymentStatus === "Paid" && !success && (
          <Alert className="mt-3" variant="success">This bill has already been paid.</Alert>
        )}
      </Card>

      <style>
        {`
          .coin-loader {
            font-size: 3rem;
          }
          .coins-drop {
            display: flex;
            justify-content: center;
            gap: 6px;
          }
          .coin {
            font-size: 1.5rem;
          }
        `}
      </style>
    </div>
  );
}
