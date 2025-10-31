// src/components/ui/Card.jsx
import React from 'react';

export default function Card({ title, subtitle, children, className='' }) {
  return (
    <div className={`card p-4 md:p-5 ${className}`}>
      {title && (
        <div className="mb-3">
          <div className="text-base font-semibold">{title}</div>
          {subtitle && <div className="text-sm text-muted">{subtitle}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
