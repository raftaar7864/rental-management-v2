// src/components/ui/Table.jsx
import React from 'react';

export default function Table({ columns, data, renderRow }) {
  return (
    <div className="overflow-auto rounded-lg card p-0">
      <table className="min-w-full table-auto">
        <thead>
          <tr className="text-left text-sm text-muted">
            {columns.map(col => (
              <th key={col.key} className="px-4 py-3">{col.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td className="p-6 text-center text-sm text-muted" colSpan={columns.length}>No records</td></tr>
          ) : data.map((row, idx) => (
            <tr key={row._id || idx} className={idx % 2 === 0 ? '' : 'bg-slate-50'}>
              {renderRow(row)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
