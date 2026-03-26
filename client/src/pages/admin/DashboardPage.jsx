import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../lib/api.js';
import { formatCompactCurrency, formatCurrency } from '../../lib/format.js';

const rangeOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'yearly', label: 'Yearly' }
];

const rangeMeta = {
  daily: {
    label: 'Today',
    transactionText: 'Transactions today',
    revenueText: 'Revenue today',
    itemsText: 'Items sold today',
    revenuePanelTitle: 'Revenue Today',
    topProductsTitle: 'Top Products Today'
  },
  weekly: {
    label: 'This Week',
    transactionText: 'Transactions this week',
    revenueText: 'Revenue this week',
    itemsText: 'Items sold this week',
    revenuePanelTitle: 'Revenue This Week',
    topProductsTitle: 'Top Products This Week'
  },
  yearly: {
    label: 'This Year',
    transactionText: 'Transactions this year',
    revenueText: 'Revenue this year',
    itemsText: 'Items sold this year',
    revenuePanelTitle: 'Revenue This Year',
    topProductsTitle: 'Top Products This Year'
  }
};

const summaryCards = [
  {
    key: 'transactionCount',
    titleKey: 'transactionText',
    variant: 'summary-icon-blue',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Zm2 0v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-13a.5.5 0 0 0-.5.5Zm2 2.5h3v4H7v-4Zm5-1h5a1 1 0 1 1 0 2h-5a1 1 0 1 1 0-2Zm0 4h3a1 1 0 1 1 0 2h-3a1 1 0 1 1 0-2Z"
          fill="currentColor"
        />
      </svg>
    )
  },
  {
    key: 'totalRevenue',
    titleKey: 'revenueText',
    variant: 'summary-icon-green',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M5 20a1 1 0 0 1-1-1V5a1 1 0 1 1 2 0v13h13a1 1 0 1 1 0 2H5Zm3-4.25a1 1 0 0 1-1-1v-3.5a1 1 0 1 1 2 0v3.5a1 1 0 0 1-1 1Zm4 0a1 1 0 0 1-1-1V8.25a1 1 0 1 1 2 0v6.5a1 1 0 0 1-1 1Zm4 0a1 1 0 0 1-1-1V6a1 1 0 1 1 2 0v8.75a1 1 0 0 1-1 1Z"
          fill="currentColor"
        />
      </svg>
    )
  },
  {
    key: 'itemsSold',
    titleKey: 'itemsText',
    variant: 'summary-icon-amber',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7 7V6a5 5 0 1 1 10 0v1h1a2 2 0 0 1 2 2v8.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5V9a2 2 0 0 1 2-2h1Zm2 0h6V6a3 3 0 1 0-6 0v1Zm-3 2v8.5a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5V9H6Z"
          fill="currentColor"
        />
      </svg>
    )
  }
];

const formatSummaryValue = (key, value) => {
  if (key === 'totalRevenue') {
    return formatCurrency(value);
  }

  return new Intl.NumberFormat('en-MY').format(value ?? 0);
};

export function DashboardPage() {
  const [range, setRange] = useState('daily');
  const [analytics, setAnalytics] = useState({
    summary: {
      transactionCount: 0,
      totalRevenue: 0,
      itemsSold: 0
    },
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
          summary: {
            transactionCount: 0,
            totalRevenue: 0,
            itemsSold: 0
          },
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

  const visibleSalesSeries = useMemo(() => {
    const nonZero = analytics.salesSeries.filter((point) => point.totalSales > 0);
    return nonZero.length > 0 ? nonZero : analytics.salesSeries.slice(0, range === 'yearly' ? 6 : 7);
  }, [analytics.salesSeries, range]);

  const topProducts = useMemo(() => analytics.topProducts.slice(0, 5), [analytics.topProducts]);
  const rangeInfo = rangeMeta[range];

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

      <div className="dashboard-summary-grid">
        {summaryCards.map((card) => (
          <article key={card.key} className="dashboard-summary-card">
            <div className={`dashboard-summary-icon ${card.variant}`}>{card.icon}</div>
            <div className="dashboard-summary-copy">
              <p>{rangeInfo[card.titleKey]}</p>
              <strong>{formatSummaryValue(card.key, analytics.summary?.[card.key])}</strong>
            </div>
          </article>
        ))}
      </div>

      <div className="dashboard-grid">
        <article className="panel dashboard-revenue-panel">
          <div className="panel-heading">
            <h3>{rangeInfo.revenuePanelTitle}</h3>
            <span className="panel-count">{rangeInfo.label}</span>
          </div>
          {isLoading ? <p>Loading revenue data...</p> : null}
          {!isLoading && visibleSalesSeries.every((point) => point.totalSales === 0) ? (
            <p>No paid sales data yet.</p>
          ) : null}
          {!isLoading && visibleSalesSeries.some((point) => point.totalSales > 0) ? (
            <div className="dashboard-revenue-list">
              {visibleSalesSeries.map((point) => (
                <article key={point.label} className="dashboard-revenue-row">
                  <div className="dashboard-revenue-meta">
                    <span>{point.label}</span>
                    <strong>{formatCompactCurrency(point.totalSales)}</strong>
                  </div>
                  <div className="dashboard-revenue-track">
                    <div
                      className="dashboard-revenue-fill"
                      style={{
                        width: `${(point.totalSales / maxSalesValue) * 100}%`
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </article>

        <article className="panel dashboard-top-products-panel">
          <div className="panel-heading">
            <h3>{rangeInfo.topProductsTitle}</h3>
            <span className="panel-count">{rangeInfo.label}</span>
          </div>
          {isLoading ? <p>Loading product sales...</p> : null}
          {!isLoading && topProducts.length === 0 ? <p>No product sales yet.</p> : null}
          {!isLoading && topProducts.length > 0 ? (
            <div className="dashboard-top-products-list">
              {topProducts.map((item, index) => (
                <article key={item.productId} className="dashboard-top-product-row">
                  <div className="dashboard-top-product-rank">{index + 1}</div>
                  <div className="dashboard-top-product-copy">
                    <strong>{item.name}</strong>
                    <p>{item.quantity} sold</p>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}

