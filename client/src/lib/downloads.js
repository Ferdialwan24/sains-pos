const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

const sanitizePdfText = (value) =>
  String(value ?? '')
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

export const downloadReceiptPdf = (transaction) => {
  const lines = [
    'Sains POS',
    `Invoice: ${transaction.invoiceNo}`,
    `Date: ${new Date(transaction.createdAt).toLocaleString('en-MY')}`,
    `Status: ${transaction.status}`,
    `Customer: ${transaction.customerName}`,
    `Table: ${transaction.tableNumber}`,
    `Cashier: ${transaction.cashier?.fullName ?? '-'}`,
    `Payment: ${transaction.paymentMethod}`,
    '------------------------------',
    ...transaction.items.flatMap((item) => [
      `${item.name}`,
      `${item.quantity} x ${item.price.toFixed(2)} = ${item.lineTotal.toFixed(2)}`
    ]),
    '------------------------------',
    `Total: ${transaction.totalAmount.toFixed(2)}`
  ];

  const textCommands = lines
    .map((line, index) => `${index === 0 ? '72 760 Td' : '0 -16 Td'} (${sanitizePdfText(line)}) Tj`)
    .join('\n');
  const contentStream = `BT\n/F1 12 Tf\n${textCommands}\nET`;
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj',
    `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj'
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  downloadBlob(new Blob([pdf], { type: 'application/pdf' }), `${transaction.invoiceNo}.pdf`);
};

export const downloadSalesReportExcel = ({ filename, title, rows }) => {
  const header = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; }
          th { background: #e2e8f0; }
        </style>
      </head>
      <body>
        <h2>${title}</h2>
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Table</th>
              <th>Cashier</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Total (RM)</th>
            </tr>
          </thead>
          <tbody>
  `;

  const body = rows
    .map(
      (row) => `
        <tr>
          <td>${row.invoiceNo}</td>
          <td>${row.createdAt}</td>
          <td>${row.customerName}</td>
          <td>${row.tableNumber}</td>
          <td>${row.cashier}</td>
          <td>${row.paymentMethod}</td>
          <td>${row.status}</td>
          <td>${row.totalAmount}</td>
        </tr>
      `
    )
    .join('');

  const footer = `
          </tbody>
        </table>
      </body>
    </html>
  `;

  downloadBlob(new Blob([header + body + footer], { type: 'application/vnd.ms-excel' }), filename);
};
