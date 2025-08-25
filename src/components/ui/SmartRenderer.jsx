// src/components/ui/SmartRenderer.jsx
'use client';

import React from 'react';

// This component is the permanent solution for rendering tables correctly.
export function SmartRenderer({ content }) {
  // Check if the content is likely a markdown table
  if (!content || !content.includes('| ---')) {
    // If not a table, just return the plain text in a paragraph
    return <p className="text-sm leading-relaxed">{content}</p>;
  }

  // If it IS a table, we parse and render it manually
  const lines = content.split('\n').filter(line => line.trim() !== '');
  
  const tableStartIndex = lines.findIndex(line => line.includes('| ---'));
  if (tableStartIndex === -1) {
    return <p className="text-sm leading-relaxed">{content}</p>;
  }

  const textBefore = lines.slice(0, tableStartIndex - 1).join('\n');
  const tableLines = lines.slice(tableStartIndex - 1);
  
  const headerLine = tableLines[0];
  const bodyLines = tableLines.slice(2);

  const headers = headerLine.split('|').map(h => h.trim()).filter(Boolean);
  const rows = bodyLines.map(line => 
    line.split('|').map(cell => cell.trim()).filter(Boolean)
  );

  return (
    <div>
      {/* Render any text that came before the table */}
      {textBefore && <p className="text-sm leading-relaxed mb-2">{textBefore}</p>}
      
      {/* Render the perfectly styled HTML table */}
      <div className="overflow-x-auto my-2 bg-white rounded-md">
        <table className="min-w-full text-sm text-left border-collapse">
          <thead className="bg-gray-200">
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
              <tr key={rowIndex} className="hover:bg-gray-50">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="p-2 border border-gray-300 text-gray-800">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}