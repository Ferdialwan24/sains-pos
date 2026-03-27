import { useEffect, useMemo, useState } from 'react';
import { downloadSalesReportExcel } from '../../lib/downloads.js';
import { apiRequest } from '../../lib/api.js';
import { formatCurrency, formatDateOnly } from '../../lib/format.js';
import {
  formatInputDate,
  getMaxCustomToDate,
  getPresetDateRange,
  isRangeLongerThanThreeMonths
} from '../../lib/dateRange.js';

const filterOptions = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Select Range' }
];

export function SalesReportsPage() {
  const [transactions, setTransactions] = useState([]);
  const [rangeMode, setRangeMode] = useState('today');
  const [dateRange, setDateRange] = useState({
    ...getPresetDateRange('today')
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const customRangeError =
    rangeMode === 'custom' && isRangeLongerThanThreeMonths(dateRange.from, dateRange.to)
      ? 'Custom range cannot exceed 3 months.'
      : '';

  useEffect(() => {
    if (rangeMode === 'custom') {
      return;
    }

    setDateRange(getPresetDateRange(rangeMode));
  }, [rangeMode]);

  useEffect(() => {
    const loadTransactions = async () => {
      if (customRangeError) {
        setTransactions([]);
        setErrorMessage(customRangeError);
        setIsLoading(false);
        return;
      }

      if (rangeMode === 'custom' && (!dateRange.from || !dateRange.to)) {
        setTransactions([]);
        setErrorMessage('Choose a start and end date.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const searchParams = new URLSearchParams();
        searchParams.set('status', 'paid');
        searchParams.set('from', dateRange.from);
        searchParams.set('to', dateRange.to);

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
  }, [customRangeError, dateRange.from, dateRange.to, rangeMode]);

  const totalSales = useMemo(
    () => transactions.reduce((sum, transaction) => sum + transaction.totalAmount, 0),
    [transactions]
  );

  const handleDownload = () => {
    downloadSalesReportExcel({
      filename: `sales-report-${dateRange.from}-${dateRange.to}.xls`,
      title: 'Sales Report',
      rows: transactions.map((transaction) => ({
        invoiceNo: transaction.invoiceNo,
        createdAt: formatDateOnly(transaction.createdAt),
        totalAmount: transaction.totalAmount.toFixed(2)
      }))
    });
  };

  const maxCustomTo = getMaxCustomToDate(dateRange.from);

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
        <div className="report-filters">
          <div className="range-switch">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                className={`range-switch-button${rangeMode === option.value ? ' range-switch-button-active' : ''}`}
                onClick={() => setRangeMode(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          {rangeMode === 'custom' ? (
            <div className="filters-row">
              <label className="field inline-field">
                <span>From</span>
                <input
                  max={formatInputDate(new Date())}
                  onChange={(event) => setDateRange((current) => ({ ...current, from: event.target.value }))}
                  type="date"
                  value={dateRange.from}
                />
              </label>
              <label className="field inline-field">
                <span>To</span>
                <input
                  max={maxCustomTo}
                  min={dateRange.from || undefined}
                  onChange={(event) => setDateRange((current) => ({ ...current, to: event.target.value }))}
                  type="date"
                  value={dateRange.to}
                />
              </label>
            </div>
          ) : null}
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

      <div className="section-heading">
        <div className="panel-heading">
          <h3>Sales List</h3>
        </div>
      </div>

      <div className="panel">
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        {isLoading ? <p>Loading sales report...</p> : null}
        {!isLoading && transactions.length === 0 ? <p>No paid transactions found.</p> : null}
        <div className="report-table">
          {transactions.length > 0 ? (
            <article className="report-row report-row-header">
              <strong>Invoice No</strong>
              <strong>Date</strong>
              <strong>Amount</strong>
            </article>
          ) : null}
          {transactions.map((transaction) => (
            <article key={transaction._id} className="report-row">
              <strong>{transaction.invoiceNo}</strong>
              <span>{formatDateOnly(transaction.createdAt)}</span>
              <span>{formatCurrency(transaction.totalAmount)}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
