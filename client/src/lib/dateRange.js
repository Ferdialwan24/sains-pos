const pad = (value) => String(value).padStart(2, '0');

export const formatInputDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const getPresetDateRange = (preset) => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (preset === 'week') {
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
  } else if (preset === 'month') {
    start.setDate(1);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return {
    from: formatInputDate(start),
    to: formatInputDate(end)
  };
};

export const isRangeLongerThanThreeMonths = (from, to) => {
  if (!from || !to) {
    return false;
  }

  const start = new Date(from);
  const end = new Date(to);
  const maxEnd = new Date(start);
  maxEnd.setMonth(maxEnd.getMonth() + 3);
  maxEnd.setHours(23, 59, 59, 999);

  return end > maxEnd;
};

export const getMaxCustomToDate = (from) => {
  const today = new Date();

  if (!from) {
    return formatInputDate(today);
  }

  const maxEnd = new Date(from);
  maxEnd.setMonth(maxEnd.getMonth() + 3);

  return formatInputDate(maxEnd < today ? maxEnd : today);
};

export const buildDateRangeParams = ({ mode, from, to }) => {
  const searchParams = new URLSearchParams();

  if (mode === 'custom') {
    if (from) {
      searchParams.set('from', from);
    }

    if (to) {
      searchParams.set('to', to);
    }

    return searchParams;
  }

  searchParams.set('range', mode);
  return searchParams;
};
