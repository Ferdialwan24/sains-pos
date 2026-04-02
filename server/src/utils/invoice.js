export const createInvoiceNumber = () => {
  const now = new Date();
  const datePart = now
    .toISOString()
    .slice(0, 10)
    .replaceAll('-', '');
  const randomPart = Math.floor(Math.random() * 9000 + 1000);

  return `SP-${datePart}-${randomPart}`;
};
