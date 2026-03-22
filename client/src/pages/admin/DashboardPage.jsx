import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api.js';
import { formatCurrency } from '../../lib/format.js';

export function DashboardPage() {
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });
  const [stats, setStats] = useState({
    activeTables: 0,
    products: 0,
    todayRevenue: 0,
    transactions: 0,
    paidTransactions: 0,
    canceledTransactions: 0,
    paymentMethods: {},
    recentTransactions: []
  });

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const searchParams = new URLSearchParams();
        if (dateRange.from) {
          searchParams.set('from', dateRange.from);
        }
        if (dateRange.to) {
          searchParams.set('to', dateRange.to);
        }
        const summaryQuery = searchParams.toString() ? `?${searchParams.toString()}` : '';
        const [tablesResponse, productsResponse, transactionsResponse, summaryResponse] = await Promise.all([
          apiRequest('/tables'),
          apiRequest('/products?includeInactive=true'),
          apiRequest(summaryQuery ? `/transactions${summaryQuery}` : '/transactions'),
          apiRequest(`/transactions/summary${summaryQuery}`)
        ]);

        setStats({
          activeTables: tablesResponse.tables.filter((table) => table.status === 'active').length,
          products: productsResponse.products.length,
          todayRevenue: summaryResponse.summary.todayRevenue,
          transactions: transactionsResponse.transactions.length,
          paidTransactions: summaryResponse.summary.paidTransactions,
          canceledTransactions: summaryResponse.summary.canceledTransactions,
          paymentMethods: summaryResponse.summary.paymentMethods,
          recentTransactions: summaryResponse.summary.recentTransactions
        });
      } catch (_error) {
        setStats({
          activeTables: 0,
          products: 0,
          todayRevenue: 0,
          transactions: 0,
          paidTransactions: 0,
          canceledTransactions: 0,
          paymentMethods: {},
          recentTransactions: []
        });
      }
    };

    loadDashboard();
  }, [dateRange.from, dateRange.to]);

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Business Dashboard</h2>
        </div>
        <p className="muted">Daily income and product sales summary will live here.</p>
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
          <span>Today Revenue</span>
          <strong>{formatCurrency(stats.todayRevenue)}</strong>
        </article>
        <article className="stat-card">
          <span>Total Transactions</span>
          <strong>{stats.transactions}</strong>
        </article>
        <article className="stat-card">
          <span>Registered Products</span>
          <strong>{stats.products}</strong>
        </article>
        <article className="stat-card">
          <span>Active Tables</span>
          <strong>{stats.activeTables}</strong>
        </article>
      </div>

      <div className="two-column-grid">
        <div className="panel">
          <h3>Transaction Status</h3>
          <div className="simple-list">
            <article className="list-row">
              <span>Paid</span>
              <strong>{stats.paidTransactions}</strong>
            </article>
            <article className="list-row">
              <span>Cancelled</span>
              <strong>{stats.canceledTransactions}</strong>
            </article>
          </div>
        </div>

        <div className="panel">
          <h3>Payment Methods</h3>
          <div className="simple-list">
            {Object.keys(stats.paymentMethods).length === 0 ? <p>No paid transactions yet.</p> : null}
            {Object.entries(stats.paymentMethods).map(([method, total]) => (
              <article key={method} className="list-row">
                <span className="capitalize-text">{method}</span>
                <strong>{formatCurrency(total)}</strong>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Recent Transactions</h3>
        <div className="simple-list">
          {stats.recentTransactions.length === 0 ? <p>No transactions yet.</p> : null}
          {stats.recentTransactions.map((transaction) => (
            <article key={transaction._id} className="list-row list-row-stack">
              <div>
                <strong>{transaction.invoiceNo}</strong>
                <p className="muted compact-text">
                  Table {transaction.tableNumber} | {transaction.customerName} | {transaction.status}
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
