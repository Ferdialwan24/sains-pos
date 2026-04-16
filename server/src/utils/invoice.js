const pad = (value) => String(value).padStart(2, '0');

export const getInvoiceDatePart = (date = new Date()) =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;

export const getInvoiceMonthKey = (date = new Date()) =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}`;

export const formatInvoiceNumber = (datePart, sequence) =>
  `SP-${datePart}-${String(sequence).padStart(4, '0')}`;
