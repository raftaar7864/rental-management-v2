// frontend/src/pages/PrintTenant.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import TenantService from "../services/TenantService";

export default function PrintTenant() {
  const { id } = useParams();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await TenantService.getTenant(id);
        if (!mounted) return;
        setTenant(res.data);
        setLoading(false);
        setTimeout(() => {
          try {
            window.print();
          } catch {}
        }, 300);
      } catch (err) {
        console.error("PrintTenant: failed to load tenant", err);
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 40, fontFamily: "Arial, sans-serif" }}>
        <h3>Preparing print...</h3>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div style={{ padding: 40, fontFamily: "Arial, sans-serif" }}>
        <h3>Tenant not found</h3>
      </div>
    );
  }

  const payments = Array.isArray(tenant.payments) ? [...tenant.payments] : [];

  const cardStyle = {
    border: "1px solid #ccc",
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#f9f9f9",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 8,
  };

  const thTdStyle = {
    padding: 6,
    borderBottom: "1px solid #ddd",
    textAlign: "left",
  };

  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", color: "#222", padding: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Tenant Details</h2>
        <div style={{ color: "#666", marginTop: 4 }}>{tenant.fullName}</div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 280, ...cardStyle }}>
          <h4 style={{ marginBottom: 8 }}>Tenant Info</h4>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr><th style={thTdStyle}>Full Name</th><td style={thTdStyle}>{tenant.fullName}</td></tr>
              <tr><th style={thTdStyle}>Tenant ID</th><td style={thTdStyle}>{tenant.tenantId || "-"}</td></tr>
              <tr><th style={thTdStyle}>Email</th><td style={thTdStyle}>{tenant.email || "-"}</td></tr>
              <tr><th style={thTdStyle}>Phone</th><td style={thTdStyle}>{tenant.phone || "-"}</td></tr>
              <tr><th style={thTdStyle}>Gender</th><td style={thTdStyle}>{tenant.gender || "-"}</td></tr>
              <tr><th style={thTdStyle}>Address</th><td style={thTdStyle}>{tenant.address || "-"}</td></tr>
            </tbody>
          </table>
        </div>

        <div style={{ flex: 1, minWidth: 280, ...cardStyle }}>
          <h4 style={{ marginBottom: 8 }}>Room & Financials</h4>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr><th style={thTdStyle}>Building</th><td style={thTdStyle}>{tenant.room?.building?.name || "-"}</td></tr>
              <tr><th style={thTdStyle}>Room</th><td style={thTdStyle}>{tenant.room?.number || "-"}</td></tr>
              <tr><th style={thTdStyle}>Rent</th><td style={thTdStyle}>₹{tenant.rentAmount ? Number(tenant.rentAmount).toFixed(2) : "0.00"}</td></tr>
              <tr><th style={thTdStyle}>Advanced</th><td style={thTdStyle}>₹{tenant.advancedAmount ? Number(tenant.advancedAmount).toFixed(2) : "0.00"}</td></tr>
              <tr><th style={thTdStyle}>Move-in</th><td style={thTdStyle}>{tenant.moveInDate ? new Date(tenant.moveInDate).toLocaleDateString() : "-"}</td></tr>
              <tr><th style={thTdStyle}>Move-out</th><td style={thTdStyle}>{tenant.moveOutDate ? new Date(tenant.moveOutDate).toLocaleDateString() : "-"}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...cardStyle }}>
        <h4 style={{ marginBottom: 8 }}>Payment History</h4>
        {payments.length === 0 ? (
          <div style={{ color: "#666" }}>No payments recorded</div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thTdStyle}>Date</th>
                <th style={thTdStyle}>Amount (₹)</th>
                <th style={thTdStyle}>Method</th>
                <th style={thTdStyle}>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={i}>
                  <td style={thTdStyle}>{new Date(p.date).toLocaleDateString()}</td>
                  <td style={thTdStyle}>₹{Number(p.amount).toFixed(2)}</td>
                  <td style={thTdStyle}>{p.method || "-"}</td>
                  <td style={thTdStyle}>{p.receiptNumber || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 12, color: "#666", fontSize: 12, textAlign: "right" }}>
        Printed: {new Date().toLocaleString()}
      </div>
    </div>
  );
}
