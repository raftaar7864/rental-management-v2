// frontend/src/pages/PaymentSlip.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Card, Alert } from "react-bootstrap";
import BillService from "../services/BillService";
import jsPDF from "jspdf";

export default function PaymentSlip() {
  const { billId } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchBill() {
      try {
        const resp = await BillService.getBill(billId);
        setBill(resp.data || resp);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch bill details.");
      }
    }
    fetchBill();
  }, [billId]);

  const downloadPDF = () => {
    if (!bill) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Payment Receipt", 20, 20);
    doc.setFontSize(12);
    doc.text(`Tenant: ${bill.tenant?.fullName}`, 20, 40);
    doc.text(`Room: ${bill.room?.number || bill.room?._id}`, 20, 50);
    doc.text(`Billing Month: ${new Date(bill.billingMonth).toLocaleString(undefined, { month: "long", year: "numeric" })}`, 20, 60);
    doc.text(`Total Paid: ₹${bill.totalAmount}`, 20, 70);
    doc.text(`Payment Ref: ${bill.paymentRef}`, 20, 80);
    doc.save(`PaymentSlip_${bill._id}.pdf`);
  };

  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!bill) return <div>Loading...</div>;

  return (
    <div className="d-flex justify-content-center my-5">
      <Card className="p-4 text-center" style={{ maxWidth: 500, width: "100%" }}>
        <h4>Payment Receipt</h4>
        <hr />
        <p><strong>Tenant:</strong> {bill.tenant?.fullName}</p>
        <p><strong>Room:</strong> {bill.room?.number || bill.room?._id}</p>
        <p><strong>Billing Month:</strong> {new Date(bill.billingMonth).toLocaleString(undefined, { month: "long", year: "numeric" })}</p>
        <h5>Total Paid: ₹{bill.totalAmount}</h5>
        <p><strong>Payment Ref:</strong> {bill.paymentRef}</p>

        <Button variant="primary" onClick={downloadPDF} className="mt-3">
          Download Receipt
        </Button>
      </Card>
    </div>
  );
}
