'use client';

/**
 * Utility to export datasets to CSV, Excel, and trigger Printer Friendly layouts.
 */

export interface ExportOptions {
  filename: string;
  title: string;
  filters?: Record<string, string>;
  data: Array<Record<string, any>>;
}

/**
 * Clean cell values to prevent CSV injection or formatting issues
 */
function cleanValue(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    return JSON.stringify(val).replace(/"/g, '""');
  }
  const str = String(val);
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export data to CSV format
 */
export function exportToCSV({ filename, title, filters, data }: ExportOptions) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const metaLines = [
    `# Report Title: ${title}`,
    `# Generated At: ${new Date().toLocaleString()}`,
  ];

  if (filters) {
    const filterStr = Object.entries(filters)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' | ');
    metaLines.push(`# Applied Filters: ${filterStr}`);
  }

  metaLines.push(''); // Empty spacer line

  const csvRows = [
    metaLines.join('\n'),
    headers.join(','),
    ...data.map((row) => headers.map((header) => cleanValue(row[header])).join(',')),
  ];

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export data to Excel (.xls HTML table wrapper)
 */
export function exportToExcel({ filename, title, filters, data }: ExportOptions) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: sans-serif; }
        h2 { color: #1e293b; }
        .meta-table { margin-bottom: 20px; font-size: 11px; color: #64748b; }
        th { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px; font-weight: bold; }
        td { border: 1px solid #cbd5e1; padding: 6px; }
      </style>
    </head>
    <body>
      <h2>${title}</h2>
      <table class="meta-table">
        <tr><td>Generated At:</td><td>${new Date().toLocaleString()}</td></tr>
  `;

  if (filters) {
    const filterStr = Object.entries(filters)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' | ');
    html += `<tr><td>Filters Applied:</td><td>${filterStr}</td></tr>`;
  }

  html += `
      </table>
      <table>
        <thead>
          <tr>
            ${headers.map((h) => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data
            .map(
              (row) =>
                `<tr>${headers
                  .map((h) => `<td>${row[h] !== null && row[h] !== undefined ? String(row[h]) : ''}</td>`)
                  .join('')}</tr>`
            )
            .join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${Date.now()}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Trigger browser print layout for PDF printing
 */
export function exportToPDF() {
  if (typeof window !== 'undefined') {
    window.print();
  }
}
