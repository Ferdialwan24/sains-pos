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
