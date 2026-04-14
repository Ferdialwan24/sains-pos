import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

export const downloadReceiptPdfFromElement = async ({ element, title }) => {
  if (!element) {
    return;
  }

  const sourceRect = element.getBoundingClientRect();
  const sourceWidth = Math.round(sourceRect.width);
  const sourceHeight = Math.round(sourceRect.height);
  const captureRoot = document.createElement('div');
  const clonedElement = element.cloneNode(true);

  captureRoot.setAttribute('aria-hidden', 'true');
  captureRoot.style.position = 'fixed';
  captureRoot.style.left = '-99999px';
  captureRoot.style.top = '0';
  captureRoot.style.width = `${sourceWidth}px`;
  captureRoot.style.padding = '0';
  captureRoot.style.background = '#ffffff';
  clonedElement.style.width = `${sourceWidth}px`;
  clonedElement.style.maxWidth = 'none';
  clonedElement.style.margin = '0';
  captureRoot.appendChild(clonedElement);
  document.body.appendChild(captureRoot);

  try {
    const canvas = await html2canvas(clonedElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a5'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const horizontalPadding = 24;
    const topPadding = 24;
    const imageWidth = Math.min(Math.round(sourceWidth * 0.75), pageWidth - horizontalPadding * 2);
    const imageHeight = (canvas.height * imageWidth) / canvas.width;
    const x = (pageWidth - imageWidth) / 2;
    const y = topPadding;

    const imageData = canvas.toDataURL('image/png');
    pdf.addImage(imageData, 'PNG', x, y, imageWidth, imageHeight);
    pdf.save(`${title || 'Receipt'}.pdf`);
  } finally {
    captureRoot.remove();
  }
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
