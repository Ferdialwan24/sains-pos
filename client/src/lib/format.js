export const formatCurrency = (value) =>
  new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value ?? 0);

export const formatCompactCurrency = (value) =>
  new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value ?? 0);

export const formatDateTime = (value) =>
  new Intl.DateTimeFormat('en-MY', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));

export const formatDateOnly = (value) =>
  new Intl.DateTimeFormat('en-MY', {
    dateStyle: 'medium'
  }).format(new Date(value));
