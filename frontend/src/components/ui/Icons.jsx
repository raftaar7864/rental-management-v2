// src/components/ui/Icons.jsx
import React from "react";

export const BuildingIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 21V3h18v18H3z M9 21V12h6v9"
    />
  </svg>
);

export const RoomIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="18" height="18" strokeWidth="2" rx="2" ry="2" />
    <path strokeWidth="2" d="M9 3v18" />
  </svg>
);

export const TenantIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="7" r="4" strokeWidth="2" />
    <path strokeWidth="2" d="M6 21v-2a6 6 0 0112 0v2" />
  </svg>
);

export const BookedIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 13l4 4L19 7"
    />
  </svg>
);

export const MenuIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeWidth="2" strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);
