import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../lib/api.js';
import { formatCompactCurrency, formatCurrency } from '../../lib/format.js';
import {
  buildDateRangeParams,
  formatInputDate,
  getMaxCustomToDate,
  getPresetDateRange,
  isRangeLongerThanThreeMonths
} from '../../lib/dateRange.js';

const rangeOptions = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Select Range' }
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
  },
  custom: {
    label: 'Custom Range',
    transactionText: 'Transactions in range',
    revenueText: 'Revenue in range',
    itemsText: 'Items sold in range',
    revenuePanelTitle: 'Revenue in Selected Range',
    topProductsTitle: 'Top Products in Selected Range'
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
  const [rangeMode, setRangeMode] = useState('today');
  const [dateRange, setDateRange] = useState({
    ...getPresetDateRange('today')
  });
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
    const loadAnalytics = async () => {
      if (customRangeError) {
        setAnalytics({
          summary: {
            transactionCount: 0,
            totalRevenue: 0,
            itemsSold: 0
          },
          salesSeries: [],
          topProducts: []
        });
        setErrorMessage(customRangeError);
        setIsLoading(false);
        return;
      }

      if (rangeMode === 'custom' && (!dateRange.from || !dateRange.to)) {
        setAnalytics({
          summary: {
            transactionCount: 0,
            totalRevenue: 0,
            itemsSold: 0
          },
          salesSeries: [],
          topProducts: []
        });
        setErrorMessage('Choose a start and end date.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const searchParams = buildDateRangeParams({
          mode: rangeMode,
          from: dateRange.from,
          to: dateRange.to
        });
        const response = await apiRequest(`/transactions/analytics?${searchParams.toString()}`);
        setAnalytics(response.analytics);
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
        setErrorMessage('Unable to load dashboard data.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, [customRangeError, dateRange.from, dateRange.to, rangeMode]);

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
  const maxCustomTo = getMaxCustomToDate(dateRange.from);

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Sales Dashboard</h2>
        </div>
        <div className="dashboard-filter-stack">
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

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

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

