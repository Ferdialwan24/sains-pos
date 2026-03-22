import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api.js';
import { formatCurrency } from '../../lib/format.js';

export function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const query = statusFilter ? `?status=${statusFilter}` : '';
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
  }, [statusFilter]);

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
        <label className="field inline-field">
          <span>Status Filter</span>
          <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
            <option value="">All</option>
            <option value="paid">Paid</option>
            <option value="cancel">Cancel</option>
          </select>
        </label>
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        {isLoading ? <p>Loading transactions...</p> : null}
        {!isLoading && transactions.length === 0 ? <p>No transactions yet.</p> : null}
        <div className="simple-list">
          {transactions.map((transaction) => (
            <article key={transaction._id} className="list-row list-row-stack">
              <div>
                <strong>{transaction.invoiceNo}</strong>
                <p className="muted compact-text">
                  Table {transaction.tableNumber} · {transaction.customerName} · {transaction.status}
                </p>
              </div>
              <span>{formatCurrency(transaction.totalAmount)}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
