import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../lib/api.js';
import { formatCompactCurrency } from '../../lib/format.js';

const rangeOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'yearly', label: 'Yearly' }
];

export function DashboardPage() {
  const [range, setRange] = useState('daily');
  const [analytics, setAnalytics] = useState({
    salesSeries: [],
    topProducts: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoading(true);

      try {
        const response = await apiRequest(`/transactions/analytics?range=${range}`);
        setAnalytics(response.analytics);
      } catch (_error) {
        setAnalytics({
          salesSeries: [],
          topProducts: []
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, [range]);

  const maxSalesValue = useMemo(
    () => Math.max(...analytics.salesSeries.map((point) => point.totalSales), 1),
    [analytics.salesSeries]
  );

  const maxProductValue = useMemo(
    () => Math.max(...analytics.topProducts.map((item) => item.quantity), 1),
    [analytics.topProducts]
  );

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Sales Dashboard</h2>
        </div>
        <div className="range-switch">
          {rangeOptions.map((option) => (
            <button
              key={option.value}
              className={`range-switch-button${range === option.value ? ' range-switch-button-active' : ''}`}
              onClick={() => setRange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-grid">
        <article className="panel chart-panel">
          <div className="panel-heading">
            <h3>Sales Graph</h3>
            <span className="panel-count">{range}</span>
          </div>
          {isLoading ? <p>Loading sales chart...</p> : null}
          {!isLoading && analytics.salesSeries.length === 0 ? <p>No paid sales data yet.</p> : null}
          <div className="chart-bars">
            {analytics.salesSeries.map((point) => (
              <article key={point.label} className="chart-bar-column">
                <strong>{formatCompactCurrency(point.totalSales)}</strong>
                <div className="chart-bar-track">
                  <div
                    className="chart-bar-fill"
                    style={{
                      height: `${(point.totalSales / maxSalesValue) * 100}%`
                    }}
                  />
                </div>
                <span>{point.label}</span>
              </article>
            ))}
          </div>
        </article>

        <article className="panel chart-panel">
          <div className="panel-heading">
            <h3>Top Products</h3>
            <span className="panel-count">{range}</span>
          </div>
          {isLoading ? <p>Loading product chart...</p> : null}
          {!isLoading && analytics.topProducts.length === 0 ? <p>No product sales yet.</p> : null}
          <div className="ranked-bars">
            {analytics.topProducts.map((item) => (
              <article key={item.productId} className="ranked-bar-row">
                <div>
                  <strong>{item.name}</strong>
                  <p className="muted compact-text">{item.quantity} sold</p>
                </div>
                <div className="ranked-bar-track">
                  <div
                    className="ranked-bar-fill"
                    style={{
                      width: `${(item.quantity / maxProductValue) * 100}%`
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

