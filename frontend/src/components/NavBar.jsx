import React, { useState, useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { Navbar, Nav, Container, Button, Offcanvas, Badge, Dropdown } from "react-bootstrap";
import { motion } from "framer-motion";
import { FaSignOutAlt, FaSignInAlt, FaUserCircle, FaBars } from "react-icons/fa";

export default function NavBar({ user: propUser, onLogout: propLogout }) {
  const ctx = useContext(AuthContext) || {};
  const user = propUser ?? ctx.user;
  const logout = propLogout ?? ctx.logout ?? (() => {});
  const [showMobile, setShowMobile] = useState(false);
  const location = useLocation();

  const handleClose = () => setShowMobile(false);
  const handleShow = () => setShowMobile(true);

  const adminLinks = [
    { name: "Dashboard", path: "/admin/dashboard" },
    { name: "Buildings", path: "/admin/buildings" },
    { name: "Rooms", path: "/admin/rooms" },
    { name: "Tenants", path: "/admin/tenants" },
    { name: "All Bills", path: "/admin/bills" },
    { name: "Generate Bill", path: "/admin/generate-bill" },
    { name: "Managers", path: "/admin/managers" },
  ];
  const managerLinks = [
    { name: "Dashboard", path: "/manager/dashboard" },
    { name: "Rooms", path: "/manager/rooms" },
    { name: "Generate Bill", path: "/manager/generate-bill" },
    { name: "Tenants", path: "/manager/tenants" },
  ];

  const navLinks = user?.role === "admin" ? adminLinks : managerLinks;
  const isActive = (path) => location.pathname === path;
  const roleColor = user?.role === "admin" ? "danger" : "success";

  return (
    <Navbar bg="light" expand="lg" className="shadow-sm" fixed="top" style={{ height: 72 }}>
      <Container fluid>
        <div className="d-flex align-items-center gap-2">
          <Button variant="outline-primary" className="d-lg-none border-0" onClick={handleShow} aria-label="Open menu">
            <FaBars size={20} />
          </Button>

          <Navbar.Brand
            as={Link}
            to={"/"}
            className="fw-bold d-flex align-items-center gap-2 mb-0"
          >
            <motion.div
              whileHover={{ rotate: 15 }}
              className="rounded-circle text-white px-3 py-2 fw-bold"
              style={{ backgroundColor: roleColor === "danger" ? "#dc3545" : "#198754" }}
            >
              RM
            </motion.div>
            <div>
              <div>Rent Collection</div>
              <small className="text-muted d-none d-sm-block">Buildings • Tenants • Payments</small>
            </div>
          </Navbar.Brand>
        </div>

        <div className="d-none d-lg-flex ms-auto align-items-center gap-3">
          {user ? (
            <>
              <Nav className="d-flex align-items-center gap-2">
                {navLinks.map((link) => (
                  <Nav.Link
                    as={Link}
                    to={link.path}
                    key={link.path}
                    className={`px-3 ${isActive(link.path) ? `text-${roleColor} fw-bold` : "text-dark"}`}
                  >
                    {link.name}
                    {isActive(link.path) && (
                      <div
                        style={{
                          height: 3,
                          width: "60%",
                          background: roleColor === "danger" ? "#dc3545" : "#198754",
                          borderRadius: 999,
                          marginTop: 6,
                        }}
                      />
                    )}
                  </Nav.Link>
                ))}
              </Nav>

              {/* Profile Dropdown */}
              <Dropdown align="end" className="ms-2">
                <Dropdown.Toggle
                  as={motion.div}
                  whileHover={{ scale: 1.03 }}
                  className="d-flex align-items-center gap-2 text-dark bg-transparent border-0"
                  style={{ cursor: "pointer", padding: "6px 8px" }}
                >
                  <FaUserCircle size={28} className="text-secondary" />
                  <div className="d-none d-md-block text-end">

                    <Badge bg={roleColor} className="text-uppercase">{user.role}</Badge>
                  </div>
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  <Dropdown.Header>
                    <div className="fw-bold">{user.fullName || user.name}</div>
                    <small className="text-muted text-uppercase">{user.role}</small>
                  </Dropdown.Header>
                  <Dropdown.Divider />
                  <Dropdown.Item
                    onClick={() => {
                      logout();
                    }}
                    className="text-danger d-flex align-items-center gap-2"
                  >
                    <FaSignOutAlt /> Sign Out
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

              {/* Keep separate Sign Out button visible as requested */}
            </>
          ) : (
            <Button as={Link} to="/login" variant="primary" className="d-flex align-items-center gap-2">
              <FaSignInAlt /> Sign In
            </Button>
          )}
        </div>

        {/* Mobile Offcanvas */}
        <Offcanvas show={showMobile} onHide={handleClose} placement="end">
          <Offcanvas.Header closeButton>
            <Offcanvas.Title>
              {user ? (
                <>
                  <FaUserCircle className="me-2 text-primary" />
                  {user.fullName || user.name}
                </>
              ) : (
                "Menu"
              )}
            </Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body>
            <Nav className="flex-column">
              {user ? (
                <>
                  <Badge bg={roleColor} className="align-self-start mb-3 text-uppercase">
                    {user.role}
                  </Badge>
                  {navLinks.map((link) => (
                    <Nav.Link
                      as={Link}
                      to={link.path}
                      key={link.path}
                      onClick={handleClose}
                      className={`mb-2 ${isActive(link.path) ? `text-${roleColor} fw-bold` : "text-dark"}`}
                    >
                      {link.name}
                    </Nav.Link>
                  ))}

                  <div className="mt-3">
                    <Button as={Link} to={`/${user?.role}/profile`} variant="outline-secondary" className="w-100 mb-2" onClick={handleClose}>
                      View Profile
                    </Button>
                    <Button
                      variant={roleColor}
                      className="w-100 d-flex align-items-center justify-content-center gap-2"
                      onClick={() => {
                        logout();
                        handleClose();
                      }}
                    >
                      <FaSignOutAlt /> Sign Out
                    </Button>
                  </div>
                </>
              ) : (
                <Button as={Link} to="/login" variant="primary" className="w-100 d-flex align-items-center justify-content-center gap-2" onClick={handleClose}>
                  <FaSignInAlt /> Sign In
                </Button>
              )}
            </Nav>
          </Offcanvas.Body>
        </Offcanvas>
      </Container>
    </Navbar>
  );
}
