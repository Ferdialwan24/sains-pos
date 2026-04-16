import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api.js';
import { formatCompactCurrency, formatCurrency } from '../../lib/format.js';
import { buildDateRangeParams } from '../../lib/dateRange.js';
import { useRoleEyebrow } from '../../hooks/useRoleEyebrow.js';
import styles from './Dashboard.module.css';

const rangeOptions = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' }
];

const rangeMeta = {
  today: {
    label: 'Today',
    transactionText: 'Transactions today',
    revenueText: 'Revenue today',
    itemsText: 'Items sold today',
    revenuePanelTitle: 'Revenue Today',
    topProductsTitle: 'Top Products Today'
  },
  week: {
    label: 'This Week',
    transactionText: 'Transactions this week',
    revenueText: 'Revenue this week',
    itemsText: 'Items sold this week',
    revenuePanelTitle: 'Revenue This Week',
    topProductsTitle: 'Top Products This Week'
  },
  month: {
    label: 'This Month',
    transactionText: 'Transactions this month',
    revenueText: 'Revenue this month',
    itemsText: 'Items sold this month',
    revenuePanelTitle: 'Revenue This Month',
    topProductsTitle: 'Top Products This Month'
  }
};

const summaryCards = [
  {
    key: 'transactionCount',
    titleKey: 'transactionText',
    variant: styles.summaryIconBlue,
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
    variant: styles.summaryIconGreen,
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
    variant: styles.summaryIconAmber,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7 7V6a5 5 0 1 1 10 0v1h1a2 2 0 0 1 2 2v8.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5V9a2 2 0 0 1 2-2h1Zm2 0h6V6a3 3 0 1 0-6 0v1Zm-3 2v8.5a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5V9H6Z"
          fill="currentColor"
        />
      </svg>
    )
  },
  {
    key: 'stockAlerts',
    title: 'Stock alerts',
    variant: styles.summaryIconRed,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 3.25 21 19a1.25 1.25 0 0 1-1.09 1.88H4.1A1.25 1.25 0 0 1 3 19L12 3.25Zm0 4.4a1 1 0 0 0-1 1v5.1a1 1 0 1 0 2 0v-5.1a1 1 0 0 0-1-1Zm0 10a1.15 1.15 0 1 0 0-2.3 1.15 1.15 0 0 0 0 2.3Z"
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

export function DashboardPageComponent() {
  const eyebrow = useRoleEyebrow('Admin');
  const [rangeMode, setRangeMode] = useState('today');
  const [analytics, setAnalytics] = useState({
    summary: {
      transactionCount: 0,
      totalRevenue: 0,
      itemsSold: 0
    },
    salesSeries: [],
    topProducts: []
  });
  const [stockAlerts, setStockAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoading(true);

      try {
        const searchParams = buildDateRangeParams({
          mode: rangeMode
        });
        const [analyticsResponse, inventoryResponse] = await Promise.all([
          apiRequest(`/transactions/analytics?${searchParams.toString()}`),
          apiRequest('/inventory')
        ]);
        setAnalytics(analyticsResponse.analytics);
        setStockAlerts(
          inventoryResponse.items
            .filter((item) => item.stockAlert?.isAlert)
            .sort((left, right) => {
              if (left.stockAlert.status === right.stockAlert.status) {
                return left.name.localeCompare(right.name);
              }

              return left.stockAlert.status === 'out' ? -1 : 1;
            })
        );
        setErrorMessage('');
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
        setStockAlerts([]);
        setErrorMessage('Unable to load dashboard data.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, [rangeMode]);

  const maxSalesValue = useMemo(
    () => Math.max(...analytics.salesSeries.map((point) => point.totalSales), 1),
    [analytics.salesSeries]
  );

  const visibleSalesSeries = useMemo(() => {
    const nonZero = analytics.salesSeries.filter((point) => point.totalSales > 0);
    const source = nonZero.length > 0 ? nonZero : analytics.salesSeries;
    const maxItems = rangeMode === 'today' ? 8 : 10;
    return source.slice(-maxItems);
  }, [analytics.salesSeries, rangeMode]);

  const topProducts = useMemo(() => analytics.topProducts.slice(0, 5), [analytics.topProducts]);
  const rangeInfo = rangeMeta[rangeMode];
  const lowStockCount = useMemo(
    () => stockAlerts.filter((item) => item.stockAlert?.status === 'low').length,
    [stockAlerts]
  );
  const outOfStockCount = useMemo(
    () => stockAlerts.filter((item) => item.stockAlert?.status === 'out').length,
    [stockAlerts]
  );

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>Sales Dashboard</h2>
        </div>
        <div className={styles.filterStack}>
          <div className="range-switch">
            {rangeOptions.map((option) => (
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
        </div>
      </div>

      <div className={styles.summaryGrid}>
        {summaryCards.map((card) => (
          <article
            key={card.key}
            className={`${styles.summaryCard}${card.key === 'stockAlerts' ? ` ${styles.stockAlertCard}` : ''}`}
          >
            <div className={`${styles.summaryIcon} ${card.variant}`}>{card.icon}</div>
            <div className={styles.summaryCopy}>
              <p>{card.title ?? rangeInfo[card.titleKey]}</p>
              {card.key === 'stockAlerts' ? (
                <div className={styles.stockAlertSummary}>
                  <div className={styles.stockAlertRows}>
                    <div className={styles.stockAlertLine}>
                      <strong className={styles.stockAlertCount}>{outOfStockCount}</strong>
                      <span className="pill pill-cancel">Out of Stock</span>
                    </div>
                    <div className={styles.stockAlertLine}>
                      <strong className={styles.stockAlertCount}>{lowStockCount}</strong>
                      <span className="pill pill-active">Low Stock</span>
                    </div>
                  </div>
                  <Link className={`secondary-button small-button ${styles.stockAlertLink}`} to="/admin/inventory">
                    View Inventory
                  </Link>
                </div>
              ) : (
                <strong>{formatSummaryValue(card.key, analytics.summary?.[card.key])}</strong>
              )}
            </div>
          </article>
        ))}
      </div>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      <div className={styles.grid}>
        <article className={`panel ${styles.revenuePanel}`}>
          <div className="panel-heading">
            <h3>{rangeInfo.revenuePanelTitle}</h3>
            <span className="panel-count">{rangeInfo.label}</span>
          </div>
          {isLoading ? <p>Loading revenue data...</p> : null}
          {!isLoading && visibleSalesSeries.every((point) => point.totalSales === 0) ? (
            <p>No paid sales data yet.</p>
          ) : null}
          {!isLoading && visibleSalesSeries.some((point) => point.totalSales > 0) ? (
            <div className={styles.revenueList}>
              {visibleSalesSeries.map((point) => (
                <article key={point.label} className={styles.revenueRow}>
                  <div className={styles.revenueMeta}>
                    <span>{point.label}</span>
                    <strong>{formatCompactCurrency(point.totalSales)}</strong>
                  </div>
                  <div className={styles.revenueTrack}>
                    <div
                      className={styles.revenueFill}
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

        <article className={`panel ${styles.topProductsPanel}`}>
          <div className="panel-heading">
            <h3>{rangeInfo.topProductsTitle}</h3>
            <span className="panel-count">{rangeInfo.label}</span>
          </div>
          {isLoading ? <p>Loading product sales...</p> : null}
          {!isLoading && topProducts.length === 0 ? <p>No product sales yet.</p> : null}
          {!isLoading && topProducts.length > 0 ? (
            <div className={styles.topProductsList}>
              {topProducts.map((item, index) => (
                <article key={item.productId} className={styles.topProductRow}>
                  <div className={styles.topProductRank}>{index + 1}</div>
                  <div className={styles.topProductCopy}>
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

