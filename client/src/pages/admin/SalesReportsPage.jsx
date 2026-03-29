import { useEffect, useMemo, useRef, useState } from 'react';
import { downloadSalesReportExcel } from '../../lib/downloads.js';
import { apiRequest } from '../../lib/api.js';
import { formatCurrency, formatDateOnly } from '../../lib/format.js';
import {
  formatInputDate,
  getMaxCustomToDate,
  getPresetDateRange,
  isRangeLongerThanThreeMonths
} from '../../lib/dateRange.js';
import { useDismissibleLayer } from '../../hooks/useDismissibleLayer.js';

const filterOptions = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Select Range' }
];

export function SalesReportsPage() {
  const [transactions, setTransactions] = useState([]);
  const [rangeMode, setRangeMode] = useState('today');
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    ...getPresetDateRange('today')
  });
  const [draftDateRange, setDraftDateRange] = useState({
    ...getPresetDateRange('today')
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const filtersRef = useRef(null);
  const draftRangeError = isRangeLongerThanThreeMonths(draftDateRange.from, draftDateRange.to)
    ? 'Custom range cannot exceed 3 months.'
    : '';

  useDismissibleLayer({
    ref: filtersRef,
    isOpen: isCustomPickerOpen,
    onClose: () => setIsCustomPickerOpen(false)
  });

  useEffect(() => {
    if (rangeMode === 'custom') {
      return;
    }

    setDateRange(getPresetDateRange(rangeMode));
  }, [rangeMode]);

  useEffect(() => {
    const loadTransactions = async () => {
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
  }, [dateRange.from, dateRange.to]);

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

  const maxCustomTo = getMaxCustomToDate(draftDateRange.from);
  const isCustomFilterActive = rangeMode === 'custom';
  const isCustomApplyDisabled =
    !draftDateRange.from || !draftDateRange.to || Boolean(draftRangeError);

  const handlePresetSelect = (mode) => {
    setRangeMode(mode);
    setIsCustomPickerOpen(false);
  };

  const handleOpenCustom = () => {
    setDraftDateRange({
      ...dateRange
    });
    setIsCustomPickerOpen((current) => !current);
  };

  const handleApplyCustomRange = () => {
    if (isCustomApplyDisabled) {
      return;
    }

    setRangeMode('custom');
    setDateRange({
      ...draftDateRange
    });
    setIsCustomPickerOpen(false);
  };

  const handleCancelCustomRange = () => {
    setDraftDateRange({
      ...dateRange
    });
    setIsCustomPickerOpen(false);
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

      <div className="sales-report-filter-panel">
        <div ref={filtersRef} className="report-filters report-filters-static">
          <div className="range-switch">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                className={`range-switch-button${
                  option.value === 'custom'
                    ? isCustomPickerOpen || isCustomFilterActive
                      ? ' range-switch-button-active'
                      : ''
                    : rangeMode === option.value
                      ? ' range-switch-button-active'
                      : ''
                }`}
                onClick={() => {
                  if (option.value === 'custom') {
                    handleOpenCustom();
                    return;
                  }

                  handlePresetSelect(option.value);
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          {isCustomPickerOpen ? (
            <div className="filter-popover">
              <label className="field inline-field">
                <span>From</span>
                <input
                  max={formatInputDate(new Date())}
                  onChange={(event) => setDraftDateRange((current) => ({ ...current, from: event.target.value }))}
                  type="date"
                  value={draftDateRange.from}
                />
              </label>
              <label className="field inline-field">
                <span>To</span>
                <input
                  max={maxCustomTo}
                  min={draftDateRange.from || undefined}
                  onChange={(event) => setDraftDateRange((current) => ({ ...current, to: event.target.value }))}
                  type="date"
                  value={draftDateRange.to}
                />
              </label>
              {draftRangeError ? <p className="form-error popover-error">{draftRangeError}</p> : null}
              <div className="filter-popover-actions">
                <button className="secondary-button small-button" onClick={handleCancelCustomRange} type="button">
                  Cancel
                </button>
                <button
                  className="primary-button small-button"
                  disabled={isCustomApplyDisabled}
                  onClick={handleApplyCustomRange}
                  type="button"
                >
                  Apply
                </button>
              </div>
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

      <div className="panel">
        <div className="panel-heading user-list-heading">
          <h3>Sales List</h3>
        </div>
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        {isLoading ? <p>Loading sales report...</p> : null}
        {!isLoading && transactions.length === 0 ? <p>No paid transactions found.</p> : null}
        <div className="report-table">
          {transactions.length > 0 ? (
            <article className="report-row report-row-header sales-report-row sales-report-row-header">
              <strong>Invoice No</strong>
              <strong>Date</strong>
              <strong>Amount</strong>
            </article>
          ) : null}
          {transactions.map((transaction) => (
            <article key={transaction._id} className="report-row sales-report-row">
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
