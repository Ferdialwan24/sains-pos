import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api.js';
import { formatCurrency, formatDateTime } from '../../lib/format.js';

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
      setIsLoading(true);

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
        <p className="muted">Final transactions are shown here with payment and cashier details.</p>
      </div>

      <div className="panel">
        <div className="filters-row">
          <label className="field inline-field">
            <span>Status</span>
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
      </div>

      <div className="transaction-list">
        {isLoading ? <div className="panel">Loading transactions...</div> : null}
        {!isLoading && transactions.length === 0 ? <div className="panel">No transactions yet.</div> : null}
        {transactions.map((transaction) => (
          <article key={transaction._id} className="transaction-card">
            <div className="transaction-card-top">
              <div>
                <strong>{transaction.invoiceNo}</strong>
                <p className="muted compact-text">{formatDateTime(transaction.createdAt)}</p>
              </div>
              <div className="transaction-amount">
                <span className={`pill ${transaction.status === 'paid' ? 'pill-success' : 'pill-cancel'}`}>
                  {transaction.status}
                </span>
                <strong>{formatCurrency(transaction.totalAmount)}</strong>
              </div>
            </div>
            <div className="transaction-card-body">
              <span>Customer: {transaction.customerName}</span>
              <span>Table: {transaction.tableNumber}</span>
              <span>Payment: {transaction.paymentMethod}</span>
              <span>Served by: {transaction.cashier?.fullName ?? '-'}</span>
            </div>
            <div className="transaction-card-actions">
              <Link className="secondary-button small-button" to={`/transactions/${transaction._id}`}>
                Receipt
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

