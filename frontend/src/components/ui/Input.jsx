// src/components/ui/Input.jsx
import React from 'react';

export default function Input({ className='', error, ...props }) {
  const errorClass = error ? 'border-red-400' : '';
  return (
    <div>
      <input className={`input w-full ${errorClass} ${className}`} {...props} />
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </div>
  );
}
