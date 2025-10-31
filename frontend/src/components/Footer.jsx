import React, { useContext } from "react";
import { Container } from "react-bootstrap";
import { AuthContext } from "../context/AuthContext";
import { motion } from "framer-motion";
import { FaHeart, FaRegBuilding, FaUserShield } from "react-icons/fa";

export default function Footer() {
  const { user } = useContext(AuthContext) || {};
  const roleColor = user?.role === "admin" ? "danger" : "success";

  return (
    <footer
      className={`bg-light text-center text-muted border-top fixed-bottom shadow-sm`}
      style={{
        fontSize: "0.9rem",
        height: "56px",
        zIndex: 1020,
      }}
    >
      <Container fluid className="h-100 d-flex justify-content-between align-items-center px-3">
        {/* Left side */}
        <motion.div whileHover={{ scale: 1.05 }} className="d-flex align-items-center gap-2">
          <FaRegBuilding className={`text-${roleColor}`} />
          <span>
            <strong className={`text-${roleColor}`}>Rental Manager</strong> ©{" "}
            {new Date().getFullYear()} (Version: 2.0.0)
          </span>
        </motion.div>

        {/* Center */}
        <div className="text-muted small d-none d-md-block">
          Manage <span className="fw-semibold">Buildings</span>,{" "}
          <span className="fw-semibold">Tenants</span>, &{" "}
          <span className="fw-semibold">Payments</span> efficiently
        </div>

        {/* Right side */}
        <motion.div whileHover={{ scale: 1.05 }} className="d-flex align-items-center gap-2">
          {user ? (
            <>
              <FaUserShield className={`text-${roleColor}`} />
              <span>
                Logged in as <strong>{user.fullName || user.name}</strong>{" "}
                <span className={`text-${roleColor} text-uppercase`}>
                  ({user.role})
                </span>
              </span>
            </>
          ) : (
            <span>
              Made with <FaHeart className="text-danger" /> for{" "}
              <strong>Our Users</strong>
            </span>
          )}
        </motion.div>
      </Container>
    </footer>
  );
}
