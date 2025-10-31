import React from 'react';
const Unauthorized = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Access denied</h2>
      <p className="text-sm text-gray-600">You don't have permission to view this page.</p>
    </div>
  </div>
);
export default Unauthorized;
