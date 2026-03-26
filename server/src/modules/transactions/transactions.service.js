import { Transaction } from '../../models/Transaction.js';

const buildDateFilter = ({ from, to }) => {
  if (!from && !to) {
    return null;
  }

  const createdAt = {};

  if (from) {
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    createdAt.$gte = fromDate;
  }

  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    createdAt.$lte = toDate;
  }

  return createdAt;
};

export const listTransactions = async ({ status, from, to }) => {
  const filter = {};

  if (status) {
    filter.status = status;
  }

  const dateFilter = buildDateFilter({ from, to });

  if (dateFilter) {
    filter.createdAt = dateFilter;
  }

  return Transaction.find(filter)
    .populate('cashier', 'fullName username')
    .sort({ createdAt: -1 });
};

const getAnalyticsWindow = (range = 'daily') => {
  const now = new Date();

  if (range === 'weekly') {
    const start = new Date(now);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return { start, end, labels, range };
  }

  if (range === 'yearly') {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return { start, end, labels, range };
  }

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const labels = Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, '0')}:00`);

  return { start, end, labels, range: 'daily' };
};

const getBucketIndex = (date, range) => {
  if (range === 'weekly') {
    const day = date.getDay();
    return day === 0 ? 6 : day - 1;
  }

  if (range === 'yearly') {
    return date.getMonth();
  }

  return date.getHours();
};

export const getTransactionAnalytics = async ({ range = 'daily' } = {}) => {
  const { start, end, labels, range: normalizedRange } = getAnalyticsWindow(range);
  const transactions = await Transaction.find({
    status: 'paid',
    createdAt: {
      $gte: start,
      $lte: end
    }
  }).sort({ createdAt: 1 });

  const salesBuckets = labels.map((label) => ({
    label,
    totalSales: 0
  }));
  const productTotals = new Map();
  const summary = {
    transactionCount: 0,
    totalRevenue: 0,
    itemsSold: 0
  };

  for (const transaction of transactions) {
    const bucketIndex = getBucketIndex(new Date(transaction.createdAt), normalizedRange);
    salesBuckets[bucketIndex].totalSales += transaction.totalAmount;
    summary.transactionCount += 1;
    summary.totalRevenue += transaction.totalAmount;

    for (const item of transaction.items) {
      const current = productTotals.get(String(item.product)) ?? {
        productId: String(item.product),
        name: item.name,
        quantity: 0
      };

      current.quantity += item.quantity;
      summary.itemsSold += item.quantity;
      productTotals.set(String(item.product), current);
    }
  }

  const topProducts = [...productTotals.values()]
    .sort((left, right) => right.quantity - left.quantity)
    .slice(0, 7);

  return {
    range: normalizedRange,
    summary,
    salesSeries: salesBuckets,
    topProducts
  };
};

export const getTransactionSummary = async ({ from, to } = {}) => {
  const filter = {};
  const dateFilter = buildDateFilter({ from, to });

  if (dateFilter) {
    filter.createdAt = dateFilter;
  }

  const transactions = await Transaction.find(filter).sort({ createdAt: -1 });
  const today = new Date().toDateString();
  const todayTransactions = transactions.filter(
    (transaction) => new Date(transaction.createdAt).toDateString() === today
  );
  const paidTransactions = transactions.filter((transaction) => transaction.status === 'paid');
  const canceledTransactions = transactions.filter((transaction) => transaction.status === 'cancel');
  const todayPaidTransactions = todayTransactions.filter((transaction) => transaction.status === 'paid');
  const paymentMethods = {};

  for (const transaction of paidTransactions) {
    const key = transaction.paymentMethod || 'unknown';
    paymentMethods[key] = (paymentMethods[key] ?? 0) + transaction.totalAmount;
  }

  return {
    todayRevenue: todayPaidTransactions.reduce((sum, transaction) => sum + transaction.totalAmount, 0),
    todayTransactions: todayTransactions.length,
    paidTransactions: paidTransactions.length,
    canceledTransactions: canceledTransactions.length,
    paymentMethods,
    recentTransactions: transactions.slice(0, 5)
  };
};

export const getTransactionDetail = async (transactionId) => {
  return Transaction.findById(transactionId).populate('cashier', 'fullName username');
};
