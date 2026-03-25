import { useEffect, useMemo, useState } from 'react';
import { downloadSalesReportExcel } from '../../lib/downloads.js';
import { apiRequest } from '../../lib/api.js';
import { formatCurrency, formatDateOnly } from '../../lib/format.js';

export function SalesReportsPage() {
  const [transactions, setTransactions] = useState([]);
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadTransactions = async () => {
      setIsLoading(true);

      try {
        const searchParams = new URLSearchParams();
        searchParams.set('status', 'paid');
        if (dateRange.from) {
          searchParams.set('from', dateRange.from);
        }
        if (dateRange.to) {
          searchParams.set('to', dateRange.to);
        }

        const response = await apiRequest(`/transactions?${searchParams.toString()}`);
        setTransactions(response.transactions);
        setErrorMessage('');
      } catch (error) {
        setErrorMessage(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadTransactions();
  }, [dateRange.from, dateRange.to]);

  const totalSales = useMemo(
    () => transactions.reduce((sum, transaction) => sum + transaction.totalAmount, 0),
    [transactions]
  );

  const handleDownload = () => {
    downloadSalesReportExcel({
      filename: `sales-report-${dateRange.from || 'all'}-${dateRange.to || 'all'}.xls`,
      title: 'Sales Report',
      rows: transactions.map((transaction) => ({
        invoiceNo: transaction.invoiceNo,
        createdAt: formatDateOnly(transaction.createdAt),
        customerName: transaction.customerName,
        tableNumber: transaction.tableNumber,
        cashier: transaction.cashier?.fullName ?? '-',
        paymentMethod: transaction.paymentMethod,
        status: transaction.status,
        totalAmount: transaction.totalAmount.toFixed(2)
      }))
    });
  };

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Sales Reports</h2>
        </div>
        <button className="primary-button" disabled={transactions.length === 0} onClick={handleDownload} type="button">
          Download Excel
        </button>
      </div>

      <div className="panel">
        <div className="filters-row">
          <label className="field inline-field">
            <span>From</span>
            <input
              onChange={(event) => setDateRange((current) => ({ ...current, from: event.target.value }))}
              type="date"
              value={dateRange.from}
            />
          </label>
          <label className="field inline-field">
            <span>To</span>
            <input
              onChange={(event) => setDateRange((current) => ({ ...current, to: event.target.value }))}
              type="date"
              value={dateRange.to}
            />
          </label>
        </div>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span>Paid Transactions</span>
          <strong>{transactions.length}</strong>
        </article>
        <article className="stat-card">
          <span>Total Sales</span>
          <strong>{formatCurrency(totalSales)}</strong>
        </article>
      </div>

      <div className="panel">
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        {isLoading ? <p>Loading sales report...</p> : null}
        {!isLoading && transactions.length === 0 ? <p>No paid transactions found.</p> : null}
        <div className="report-table">
          {transactions.map((transaction) => (
            <article key={transaction._id} className="report-row">
              <strong>{transaction.invoiceNo}</strong>
              <span>{formatDateOnly(transaction.createdAt)}</span>
              <span>{transaction.customerName}</span>
              <span>Table {transaction.tableNumber}</span>
              <span>{transaction.cashier?.fullName ?? '-'}</span>
              <span>{formatCurrency(transaction.totalAmount)}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
