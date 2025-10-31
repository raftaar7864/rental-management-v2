import React from "react";
import NavBar from "./NavBar";
import { Container } from "react-bootstrap";

/**
 * DashboardLayout
 *
 * Props:
 *  - children: page contents
 *  - user: optional user object (if provided, left sidebar will show on md+)
 *  - onLogout: optional logout handler (passed down to NavBar)
 *
 * Notes:
 *  - Keep NAV_HEIGHT in sync with NavBar's fixed height (72px).
 *  - SIDEBAR_WIDTH applies only on md+ screens and is applied via CSS media query.
 */
export default function DashboardLayout({ children, user, onLogout }) {
  const NAV_HEIGHT = 72; // px — keep this in sync with NavBar fixed height
  const SIDEBAR_WIDTH = 220; // px — width of the left sidebar on md+ screens

  return (
    <div>
      {/* top nav — fixed */}
      <NavBar user={user} onLogout={onLogout} />

      {/* left sidebar: present only when user is available and viewport >= md (use bootstrap responsive helpers) */}
      {user && (
        <aside
          className="d-none d-md-block"
          aria-hidden={!user}
          style={{
            position: "fixed",
            top: NAV_HEIGHT,
            left: 0,
            bottom: 0,
            width: SIDEBAR_WIDTH,
            padding: 12,
            borderRight: "1px solid rgba(0,0,0,0.05)",
            background: "#f8f9fa",
            zIndex: 50,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{user?.companyName || "Admin"}</div>
          {/* You can render additional sidebar content here or keep it minimal — NavBar already has main links */}
        </aside>
      )}

      {/* main content area */}
      <main
        style={{
          // offset from top nav
          paddingTop: NAV_HEIGHT + 16,
          paddingLeft: 16,
          paddingRight: 16,
          // ensure content isn't hidden behind fixed left sidebar on md+ screens
          // This uses a CSS media query via inline style: we use a wrapper that applies left padding only on md+ (Bootstrap md starts at 768px).
        }}
      >
        <Container fluid>
          <div
            // The inline style below applies left padding equal to SIDEBAR_WIDTH on md+.
            // We do this with a responsive class using a media query inside a style tag (scoped) to avoid reading window size.
            style={{ paddingLeft: 0 }}
          >
            {/* embed small style tag to apply responsive left padding without JS */}
            <style>{`
              @media (min-width: 768px) {
                .dashboard-content-inner { padding-left: ${user ? SIDEBAR_WIDTH + 24 : 0}px; }
              }
            `}</style>

            <div className="dashboard-content-inner">{children}</div>
          </div>
        </Container>
      </main>
    </div>
  );
}
