import React, { useEffect, useRef } from "react";
import { Dropdown } from "react-bootstrap";
import { Cog } from "lucide-react";

/**
 * IconDropdown
 * - Single Cog icon (no arrow)
 * - Cog spins briefly when menu opens (class "spin")
 * - Optional hoverToOpen
 * - Accessible (keyboard Enter/Space to toggle, Escape to close)
 *
 * Props:
 *  - actions: [{ icon: IconComp, title, label, handler, color }]
 *  - showText: boolean (show label next to icon in menu)
 *  - hoverToOpen: boolean (open menu on hover)
 */
const IconDropdown = ({ actions = [], showText = false, hoverToOpen = false }) => {
  const [open, setOpen] = React.useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // Toggle open state and trigger spin by briefly toggling class (handled by CSS via open state)
  const toggle = (e) => {
    e?.stopPropagation?.();
    setOpen((v) => !v);
  };

  const closeAndRun = (handler) => (e) => {
    e?.stopPropagation?.();
    setOpen(false);
    try {
      handler?.(e);
    } catch (err) {
      // swallow handler errors to avoid leaving menu in broken state
      console.error("IconDropdown action error:", err);
    }
  };

  // keyboard support on the toggle
  const onToggleKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle(e);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`icon-dropdown-wrapper ${hoverToOpen ? "hover-open" : ""}`}
      onMouseEnter={() => hoverToOpen && setOpen(true)}
      onMouseLeave={() => hoverToOpen && setOpen(false)}
      style={{ display: "inline-block" }}
    >
      <Dropdown align="end" show={open} onToggle={(next) => setOpen(next)}>
        <Dropdown.Toggle
          as="div"
          role="button"
          tabIndex={0}
          aria-haspopup="menu"
          aria-expanded={open}
          onKeyDown={onToggleKey}
          onClick={(e) => {
            e.stopPropagation();
            toggle(e);
          }}
          className="icon-dropdown-toggle"
          style={{ display: "inline-flex" }}
        >
          <button
            type="button"
            aria-label="Open actions"
            className="btn btn-outline-secondary p-0 rounded-circle"
            style={{
              width: 34,
              height: 34,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(0,0,0,0.06)",
              background: "transparent",
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {/* Cog only — add spin class when open */}
            <Cog size={16} className={`text-muted ${open ? "spin" : ""}`} />
          </button>
        </Dropdown.Toggle>

        <Dropdown.Menu
          align="end"
          className={`icon-dropdown-menu ${open ? "enter" : ""}`}
          style={{ minWidth: 140, zIndex: 2500, padding: 6, borderRadius: 10 }}
          onClick={(e) => e.stopPropagation()}
        >
          {actions.map((action, i) => (
            <Dropdown.Item
              key={i}
              onClick={closeAndRun(action.handler)}
              className={`d-flex align-items-center gap-2 py-2 px-2 ${action.color === "danger" ? "text-danger" : "text-dark"}`}
              style={{ borderRadius: 8 }}
              title={action.title || action.label}
            >
              {action.icon && <action.icon size={16} />}
              {showText && <span>{action.label || action.title}</span>}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};

export default IconDropdown;
