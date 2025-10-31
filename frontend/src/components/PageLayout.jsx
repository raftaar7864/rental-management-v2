// src/components/PageLayout.jsx
import React from "react";
import { Container } from "react-bootstrap";

export default function PageLayout({ children, title, subtitle, headerRight , compact = false}) {
  return (
    <div
      style={{
        paddingTop: "40px",
        overflowY: "auto",
        maxHeight: "calc(100vh - 70px)",
        paddingLeft: compact ? "0.0rem" : "0.0rem",
        paddingRight: compact ? "0.0rem" : "0.0rem",
        fontSize: compact ? "0.8rem" : "0.9rem",
        lineHeight: compact ? "1.0" : "1.2",
        transition: "all 0.3s ease",
      }}
    >
      <Container fluid className="py-4 px-4">
        {/* Optional Page Header */}
        {(title || subtitle || headerRight) && (
          <div
            className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3"
            style={{
              borderBottom: "1px solid #dee2e6",
              paddingBottom: "0.75rem",
            }}
          >
            <div>
              {title && (
                <h4 className="fw-semibold mb-1 text-primary">{title}</h4>
              )}
              {subtitle && (
                <small className="text-muted">{subtitle}</small>
              )}
            </div>
            {headerRight && <div>{headerRight}</div>}
          </div>
        )}

        {/* Main Content */}
        <div
          className="bg-white rounded-4 shadow-sm p-4"
          style={{
            minHeight: "70vh",
            transition: "all 0.3s ease",
          }}
        >
          {children}
        </div>
      </Container>
    </div>
  );
}
