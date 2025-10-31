import React, { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { motion } from "framer-motion";
import {
  FaBuilding,
  FaUserFriends,
  FaFileInvoiceDollar,
  FaSignOutAlt,
  FaUserTie,
  FaHome,
  FaDoorOpen,
  FaFileSignature,
} from "react-icons/fa";
import { Button, Badge } from "react-bootstrap";

export default function SideBar({ collapsed, setCollapsed }) {
  const { user, logout } = useContext(AuthContext) || {};
  const location = useLocation();

  const isActive = (path) => location.pathname === path;
  const roleColor = user?.role === "admin" ? "danger" : "success";

  const toggleSidebar = () => setCollapsed((prev) => !prev);

  const adminLinks = [
    { name: "Dashboard", path: "/admin/dashboard", icon: <FaHome /> },
    { name: "Buildings", path: "/admin/buildings", icon: <FaBuilding /> },
    { name: "Rooms", path: "/admin/rooms", icon: <FaDoorOpen /> },
    { name: "Tenants", path: "/admin/tenants", icon: <FaUserFriends /> },
    { name: "Bills", path: "/admin/bills", icon: <FaFileInvoiceDollar /> },
    { name: "Generate Bill", path: "/admin/generate-bill", icon: <FaFileSignature /> },
    { name: "Managers", path: "/admin/managers", icon: <FaUserTie /> },
  ];

  const managerLinks = [
    { name: "Dashboard", path: "/manager/dashboard", icon: <FaHome /> },
    { name: "Rooms", path: "/manager/rooms", icon: <FaDoorOpen /> },
    { name: "Generate Bill", path: "/manager/generate-bill", icon: <FaFileSignature /> },
    { name: "Tenants", path: "/manager/tenants", icon: <FaUserFriends /> },
  ];

  const navLinks = user?.role === "admin" ? adminLinks : managerLinks;

  return (
    <motion.aside
      animate={{ width: collapsed ? "70px" : "240px" }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="bg-light shadow-sm vh-100 position-fixed top-0 start-0 d-flex flex-column border-end"
      style={{ zIndex: 1040 }}
    >
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between p-3 border-bottom">
        <motion.div
          className={`fw-bold text-${roleColor}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {!collapsed ? "🏢 Rental Manager" : "🏢"}
        </motion.div>
        <Button variant="outline-secondary" size="sm" className="border-0" onClick={toggleSidebar}>
          ☰
        </Button>
      </div>

      {/* User Info */}
      {user && (
        <div className="p-3 border-bottom text-center">
          <div className="fw-semibold">{collapsed ? user.name[0] : user.fullName || user.name}</div>
          {!collapsed && (
            <Badge bg={roleColor} className="text-uppercase mt-1">
              {user.role}
            </Badge>
          )}
        </div>
      )}

      {/* Links */}
      <nav className="flex-grow-1 py-3">
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`d-flex align-items-center px-3 py-2 mb-2 text-decoration-none ${
              isActive(link.path)
                ? `bg-${roleColor} text-white rounded`
                : "text-dark"
            }`}
          >
            <span className="fs-5 me-2">{link.icon}</span>
            {!collapsed && <span>{link.name}</span>}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto p-3 border-top">
        {user ? (
          <Button
            variant={roleColor}
            className="w-100 d-flex align-items-center justify-content-center gap-2"
            onClick={logout}
          >
            <FaSignOutAlt /> {!collapsed && "Sign Out"}
          </Button>
        ) : (
          <Button
            as={Link}
            to="/login"
            variant="primary"
            className="w-100 d-flex align-items-center justify-content-center gap-2"
          >
            <FaUserTie /> {!collapsed && "Sign In"}
          </Button>
        )}
      </div>
    </motion.aside>
  );
}
