// ===== CSV export (Excel-safe, doubles as the owner's backup habit) =====

export function downloadCSV(filename, rows) {
  if (!rows.length) return false;
  const headers = [...new Set(rows.flatMap(r => Object.keys(r)))];
  const cell = v => {
    let s = String(v ?? '');
    // Stop spreadsheet formula injection: a leading = + - @ (or control
    // char) makes Excel/Sheets execute the cell. Prefix with an apostrophe.
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = '﻿' + [headers.join(','), ...rows.map(r => headers.map(h => cell(r[h])).join(','))].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return true;
}
