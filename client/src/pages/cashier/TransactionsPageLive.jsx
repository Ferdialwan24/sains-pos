import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api.js';
import { formatCurrency } from '../../lib/format.js';

export function TransactionsPageLive() {
  const [transactions, setTransactions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const searchParams = new URLSearchParams();
        if (statusFilter) {
          searchParams.set('status', statusFilter);
        }
        if (dateRange.from) {
          searchParams.set('from', dateRange.from);
        }
        if (dateRange.to) {
          searchParams.set('to', dateRange.to);
        }

        const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
        const response = await apiRequest(`/transactions${query}`);
        setTransactions(response.transactions);
        setErrorMessage('');
      } catch (error) {
        setErrorMessage(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadTransactions();
  }, [dateRange.from, dateRange.to, statusFilter]);

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Cashier</p>
          <h2>Transactions</h2>
        </div>
        <p className="muted">Only final transactions with status paid or cancel will appear here.</p>
      </div>

      <div className="panel">
        <div className="filters-row">
          <label className="field inline-field">
            <span>Status Filter</span>
            <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option value="">All</option>
              <option value="paid">Paid</option>
              <option value="cancel">Cancel</option>
            </select>
          </label>
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
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        {isLoading ? <p>Loading transactions...</p> : null}
        {!isLoading && transactions.length === 0 ? <p>No transactions yet.</p> : null}
        <div className="simple-list">
          {transactions.map((transaction) => (
            <article key={transaction._id} className="list-row list-row-stack">
              <div>
                <strong>{transaction.invoiceNo}</strong>
                <p className="muted compact-text">
                  Table {transaction.tableNumber} | {transaction.customerName} | {transaction.status} |{' '}
                  {transaction.paymentMethod}
                </p>
              </div>
              <div className="row-actions">
                <span>{formatCurrency(transaction.totalAmount)}</span>
                <Link className="secondary-button small-button" to={`/transactions/${transaction._id}`}>
                  Receipt
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
