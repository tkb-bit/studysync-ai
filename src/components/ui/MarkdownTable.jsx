// src/components/ui/MarkdownTable.jsx
'use client';

import React from 'react';

// This component takes raw markdown text and renders ONLY the table within it.
export function MarkdownTable({ text }) {
  if (!text || !text.includes('|')) {
    return null; // Don't render if it's not a table
  }

  const lines = text.split('\n').filter(line => line.includes('|'));
  const headerLine = lines[0];
  const bodyLines = lines.slice(2); // Skip the separator line ' |---|---| '

  const headers = headerLine.split('|').map(h => h.trim()).filter(Boolean);
  const rows = bodyLines.map(line => 
    line.split('|').map(cell => cell.trim()).filter(Boolean)
  );

  return (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full text-sm text-left border-collapse">
        <thead className="bg-gray-100">
          <tr>
            {headers.map((header, index) => (
              <th key={index} className="p-2 border border-gray-300 font-semibold text-gray-700">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="bg-white hover:bg-gray-50">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="p-2 border border-gray-300 text-gray-800">
                  {cell.replace(/\\\|/g, '|')} {/* Handle escaped pipes if any */}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}