// src/components/ui/Button.jsx
import React from 'react';

export default function Button({ children, variant='primary', size='md', className='', ...props }) {
  const base = 'inline-flex items-center justify-center font-medium rounded-xl-2 px-4 py-2 transition';
  const styles = {
    primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-md',
    ghost: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50',
    danger: 'bg-accent-500 text-white hover:bg-accent-400 shadow-sm',
    link: 'bg-transparent text-brand-600 underline'
  }[variant];

  const sizes = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-5 py-3'
  }[size];

  return (
    <button className={`${base} ${styles} ${sizes} ${className}`} {...props}>
      {children}
    </button>
  );
}
