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
import { useRoleEyebrow } from '../../hooks/useRoleEyebrow.js';
import styles from './SalesReports.module.css';

const filterOptions = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Select Range' }
];

const reportTabs = [
  { value: 'sales', label: 'Sales' },
  { value: 'product', label: 'Product' }
];

export function SalesReportsPageComponent() {
  const eyebrow = useRoleEyebrow('Admin');
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('sales');
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

        const [transactionsResponse, productsResponse, categoriesResponse] = await Promise.all([
          apiRequest(`/transactions?${searchParams.toString()}`),
          apiRequest('/products?includeInactive=true'),
          apiRequest('/categories')
        ]);
        setTransactions(transactionsResponse.transactions);
        setProducts(productsResponse.products);
        setCategories(categoriesResponse.categories);
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
  const hasCategories = categories.length > 0;

  const productRows = useMemo(() => {
    const productCategoryMap = new Map(
      products.map((product) => [
        String(product._id),
        product.category?.name?.trim() ? product.category.name : '-'
      ])
    );
    const productMap = new Map();

    for (const transaction of transactions) {
      for (const item of transaction.items ?? []) {
        const key = String(item.product ?? item.name);
        const current = productMap.get(key) ?? {
          productName: item.name,
          categoryName: productCategoryMap.get(String(item.product)) ?? '-',
          quantitySold: 0
        };

        current.quantitySold += Number(item.quantity ?? 0);
        productMap.set(key, current);
      }
    }

    return Array.from(productMap.values()).sort((left, right) => {
      if (right.quantitySold !== left.quantitySold) {
        return right.quantitySold - left.quantitySold;
      }

      return left.productName.localeCompare(right.productName);
    });
  }, [products, transactions]);

  const totalQuantitySold = useMemo(
    () => productRows.reduce((sum, product) => sum + product.quantitySold, 0),
    [productRows]
  );

  const handleDownload = () => {
    if (activeTab === 'product') {
      downloadSalesReportExcel({
        filename: `product-report-${dateRange.from}-${dateRange.to}.xls`,
        title: 'Product Report',
        columns: hasCategories
          ? [
              { key: 'productName', label: 'Product' },
              { key: 'categoryName', label: 'Category' },
              { key: 'quantitySold', label: 'Qty Sold' }
            ]
          : [
              { key: 'productName', label: 'Product' },
              { key: 'quantitySold', label: 'Qty Sold' }
            ],
        rows: productRows.map((product) => ({
          productName: product.productName,
          categoryName: product.categoryName,
          quantitySold: product.quantitySold
        }))
      });
      return;
    }

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
          <p className="eyebrow">{eyebrow}</p>
          <h2>Sales Reports</h2>
        </div>
      </div>

      <div className={styles.tabBar}>
        <div className="range-switch">
          {reportTabs.map((tab) => (
            <button
              key={tab.value}
              className={`range-switch-button${activeTab === tab.value ? ' range-switch-button-active' : ''}`}
              onClick={() => setActiveTab(tab.value)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.filterPanel}>
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
        <button
          className={`primary-button ${styles.downloadButton}`}
          disabled={activeTab === 'sales' ? transactions.length === 0 : productRows.length === 0}
          onClick={handleDownload}
          type="button"
        >
          Download Excel
        </button>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span>{activeTab === 'sales' ? 'Paid Transactions' : 'Products Sold'}</span>
          <strong>{activeTab === 'sales' ? transactions.length : productRows.length}</strong>
        </article>
        <article className="stat-card">
          <span>{activeTab === 'sales' ? 'Total Sales' : 'Total Quantity Sold'}</span>
          <strong>{activeTab === 'sales' ? formatCurrency(totalSales) : totalQuantitySold}</strong>
        </article>
      </div>

      <div className="panel">
        <div className="panel-heading user-list-heading">
          <h3>{activeTab === 'sales' ? 'Sales List' : 'Product List'}</h3>
        </div>
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        {isLoading ? <p>Loading sales report...</p> : null}
        {!isLoading && activeTab === 'sales' && transactions.length === 0 ? <p>No paid transactions found.</p> : null}
        {!isLoading && activeTab === 'product' && productRows.length === 0 ? <p>No sold products found.</p> : null}
        <div className="report-table">
          {activeTab === 'sales' ? (
            <>
              {transactions.length > 0 ? (
                <article className={`report-row report-row-header ${styles.row} ${styles.rowHeader}`}>
                  <strong>Invoice No</strong>
                  <strong>Date</strong>
                  <strong>Amount</strong>
                </article>
              ) : null}
              {transactions.map((transaction) => (
                <article key={transaction._id} className={`report-row ${styles.row}`}>
                  <strong>{transaction.invoiceNo}</strong>
                  <span>{formatDateOnly(transaction.createdAt)}</span>
                  <span>{formatCurrency(transaction.totalAmount)}</span>
                </article>
              ))}
            </>
          ) : (
            <>
              {productRows.length > 0 ? (
                <article
                  className={`report-row report-row-header ${styles.row} ${styles.productRow} ${styles.rowHeader}`}
                  style={{ gridTemplateColumns: hasCategories ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))' }}
                >
                  <strong>Product</strong>
                  {hasCategories ? <strong>Category</strong> : null}
                  <strong>Qty Sold</strong>
                </article>
              ) : null}
              {productRows.map((product) => (
                <article
                  key={product.productName}
                  className={`report-row ${styles.row} ${styles.productRow}`}
                  style={{ gridTemplateColumns: hasCategories ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))' }}
                >
                  <strong>{product.productName}</strong>
                  {hasCategories ? <span>{product.categoryName}</span> : null}
                  <span>{product.quantitySold}</span>
                </article>
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
