import { useEffect, useMemo, useRef, useState } from 'react';
import { FormModal } from '../../components/common/FormModal.jsx';
import { IconButton } from '../../components/common/IconButton.jsx';
import { useRoleEyebrow } from '../../hooks/useRoleEyebrow.js';
import { apiRequest } from '../../lib/api.js';
import { getPresetDateRange } from '../../lib/dateRange.js';
import { downloadReceiptPdfFromElement } from '../../lib/downloads.js';
import { formatCurrency, formatDateTime } from '../../lib/format.js';
import styles from './Transactions.module.css';

const dateFilterOptions = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' }
];

const statusFilterOptions = [
  { label: 'All', value: '' },
  { label: 'Paid', value: 'paid' },
  { label: 'Cancel', value: 'cancel' }
];

const getReceiptTableLabel = (transaction) =>
  transaction.orderType === 'takeaway' ? 'Takeaway' : transaction.tableNumber ?? '-';

const getReceiptPaymentLabel = (transaction) =>
  transaction.status === 'cancel' ? '-' : transaction.paymentMethod ?? '-';

const ReceiptContent = ({ transaction, receiptRef = null }) => {
  if (!transaction) {
    return null;
  }

  return (
    <div className={`receipt-panel ${styles.receiptModalPanel}`} ref={receiptRef}>
      <div className="receipt-header">
        <div className="receipt-header-copy">
          <h3>SAINS-POS</h3>
          <div className="receipt-detail-lines">
            <div className="receipt-detail-line">
              <span>Invoice</span>
              <span>:</span>
              <span>{transaction.invoiceNo}</span>
            </div>
            <div className="receipt-detail-line">
              <span>Customer</span>
              <span>:</span>
              <span>{transaction.customerName}</span>
            </div>
            <div className="receipt-detail-line">
              <span>Table</span>
              <span>:</span>
              <span>{getReceiptTableLabel(transaction)}</span>
            </div>
            <div className="receipt-detail-line">
              <span>Served By</span>
              <span>:</span>
              <span>{transaction.cashier?.fullName ?? '-'}</span>
            </div>
            <div className="receipt-detail-line">
              <span>Date</span>
              <span>:</span>
              <span>{formatDateTime(transaction.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="receipt-status-row">
          <span className={`pill receipt-status-pill ${transaction.status === 'paid' ? 'pill-success' : 'pill-cancel'}`}>
            {transaction.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="receipt-divider" />

      <div className="receipt-section-heading">
        <span>Order Items</span>
      </div>
      <div className="receipt-items">
        {transaction.items.map((item) => (
          <article key={`${transaction._id}-${item.product}`} className="receipt-item-row">
            <div className="receipt-item-top">
              <strong>{item.name}</strong>
              <span>{formatCurrency(item.lineTotal)}</span>
            </div>
            <p className="receipt-item-meta">
              {item.quantity} x {formatCurrency(item.price)}
            </p>
          </article>
        ))}
      </div>

      <div className="receipt-divider" />

      <div className="receipt-footer-summary">
        <div className="receipt-total-row">
          <span>GRAND TOTAL</span>
          <span>:</span>
          <strong>{formatCurrency(transaction.totalAmount)}</strong>
        </div>
        <div className="receipt-total-row receipt-payment-row">
          <span>PAYMENT METHOD</span>
          <span>:</span>
          <strong className={getReceiptPaymentLabel(transaction) === '-' ? '' : 'capitalize-text'}>
            {getReceiptPaymentLabel(transaction)}
          </strong>
        </div>
      </div>
    </div>
  );
};

const TransactionDetailContent = ({ transaction }) => {
  if (!transaction) {
    return null;
  }

  const isCanceled = transaction.status === 'cancel';

  return (
    <div className={styles.cancelDetailCard}>
      <div className={styles.cancelHeader}>
        <div className={styles.cancelHeaderCopy}>
          <span className={styles.cancelLabel}>{isCanceled ? 'Canceled Transaction' : 'Paid Transaction'}</span>
          <strong>{transaction.invoiceNo}</strong>
        </div>
        <span className={`pill ${isCanceled ? 'pill-cancel' : 'pill-success'}`}>{transaction.status.toUpperCase()}</span>
      </div>

      <div className={styles.cancelMetaGrid}>
        <article className={styles.cancelMetaItem}>
          <span>Customer</span>
          <span>:</span>
          <strong>{transaction.customerName}</strong>
        </article>
        <article className={styles.cancelMetaItem}>
          <span>Table</span>
          <span>:</span>
          <strong>{getReceiptTableLabel(transaction)}</strong>
        </article>
        <article className={styles.cancelMetaItem}>
          <span>Served By</span>
          <span>:</span>
          <strong>{transaction.cashier?.fullName ?? '-'}</strong>
        </article>
        <article className={styles.cancelMetaItem}>
          <span>Date</span>
          <span>:</span>
          <strong>{formatDateTime(transaction.createdAt)}</strong>
        </article>
        <article className={styles.cancelMetaItem}>
          <span>Payment Method</span>
          <span>:</span>
          <strong className={isCanceled ? '' : 'capitalize-text'}>{getReceiptPaymentLabel(transaction)}</strong>
        </article>
      </div>

      {isCanceled ? (
        <article className={styles.cancelReasonCard}>
          <span>Cancel Reason</span>
          <span>:</span>
          <strong>{transaction.cancelReason?.trim() || '-'}</strong>
        </article>
      ) : null}

      <div className={styles.cancelItemsSection}>
        <div className={styles.cancelItemsHeader}>
          <span>Order Items</span>
          <strong>{transaction.items.length} item(s)</strong>
        </div>
        <div className={styles.cancelItemsList}>
          {transaction.items.map((item) => (
            <article key={`${transaction._id}-${item.product}`} className={styles.cancelItemRow}>
              <div className={styles.cancelItemCopy}>
                <strong>{item.name}</strong>
                <span className={styles.cancelItemMeta}>
                  {item.quantity} x {formatCurrency(item.price)}
                </span>
              </div>
              <span className={styles.cancelItemTotal}>{formatCurrency(item.lineTotal)}</span>
            </article>
          ))}
        </div>
        <div className={styles.cancelTotalRow}>
          <span>Total</span>
          <strong>{formatCurrency(transaction.totalAmount)}</strong>
        </div>
      </div>
    </div>
  );
};

export function TransactionsPageComponent() {
  const eyebrow = useRoleEyebrow('Cashier');
  const detailReceiptRef = useRef(null);
  const [transactions, setTransactions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [detailTransaction, setDetailTransaction] = useState(null);
  const [activeTransactionId, setActiveTransactionId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [detailErrorMessage, setDetailErrorMessage] = useState('');

  const activeDateRange = useMemo(() => getPresetDateRange(dateFilter), [dateFilter]);

  useEffect(() => {
    const loadTransactions = async () => {
      setIsLoading(true);

      try {
        const searchParams = new URLSearchParams();
        if (statusFilter) {
          searchParams.set('status', statusFilter);
        }
        if (activeDateRange.from) {
          searchParams.set('from', activeDateRange.from);
        }
        if (activeDateRange.to) {
          searchParams.set('to', activeDateRange.to);
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
  }, [activeDateRange.from, activeDateRange.to, statusFilter]);

  const openTransactionDetail = async (transactionId) => {
    setActiveTransactionId(transactionId);
    setIsDetailLoading(true);
    setDetailErrorMessage('');

    try {
      const response = await apiRequest(`/transactions/${transactionId}`);
      setDetailTransaction(response.transaction);
    } catch (error) {
      setDetailErrorMessage(error.message);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setDetailTransaction(null);
    setActiveTransactionId('');
    setIsDetailLoading(false);
    setDetailErrorMessage('');
  };

  const isDetailModalOpen = Boolean(activeTransactionId);

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>Transactions</h2>
        </div>
      </div>

      <div className={styles.filterPanel}>
        <div className={styles.filterGroups}>
          <div className="range-switch">
            {statusFilterOptions.map((option) => (
              <button
                key={option.value || 'all'}
                className={`range-switch-button${statusFilter === option.value ? ' range-switch-button-active' : ''}`}
                onClick={() => setStatusFilter(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="range-switch">
            {dateFilterOptions.map((option) => (
              <button
                key={option.value}
                className={`range-switch-button${dateFilter === option.value ? ' range-switch-button-active' : ''}`}
                onClick={() => setDateFilter(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      </div>

      <div className="panel">
        <div className="panel-heading user-list-heading">
          <h3>Transaction List</h3>
        </div>
        {isLoading ? <p>Loading transactions...</p> : null}
        {!isLoading && transactions.length === 0 ? <p>No transactions yet.</p> : null}
        <div className={`report-table ${styles.table}`}>
          {transactions.length > 0 ? (
            <article className={`report-row report-row-header ${styles.row} ${styles.rowHeader}`}>
              <strong>Invoice No</strong>
              <strong>Status Payment</strong>
              <strong>Amount</strong>
              <strong>Details</strong>
            </article>
          ) : null}
          {transactions.map((transaction) => (
            <article key={transaction._id} className={`report-row ${styles.row}`}>
              <strong>{transaction.invoiceNo}</strong>
              <span className={`pill ${transaction.status === 'paid' ? 'pill-success' : 'pill-cancel'}`}>
                {transaction.status.toUpperCase()}
              </span>
              <span>{formatCurrency(transaction.totalAmount)}</span>
              <div className={`row-actions ${styles.rowActions}`}>
                <IconButton icon="view" label="View transaction detail" onClick={() => openTransactionDetail(transaction._id)} />
              </div>
            </article>
          ))}
        </div>
      </div>

      <FormModal
        footer={
          <>
            <button className="secondary-button" onClick={closeDetailModal} type="button">
              Close
            </button>
            {detailTransaction?.status !== 'cancel' ? (
              <button
                className="primary-button"
                disabled={!detailTransaction}
                onClick={() =>
                  detailTransaction &&
                  downloadReceiptPdfFromElement({
                    element: detailReceiptRef.current,
                    title: detailTransaction.invoiceNo
                  })
                }
                type="button"
              >
                Download Receipt
              </button>
            ) : null}
          </>
        }
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        title="Transaction Details"
      >
        {isDetailLoading ? <p>Loading transaction detail...</p> : null}
        {detailErrorMessage ? <p className="form-error">{detailErrorMessage}</p> : null}
        {!isDetailLoading && !detailErrorMessage && detailTransaction ? (
          <>
            <TransactionDetailContent transaction={detailTransaction} />
            {detailTransaction.status !== 'cancel' ? (
              <div aria-hidden="true" className={styles.hiddenReceiptExport}>
                <ReceiptContent receiptRef={detailReceiptRef} transaction={detailTransaction} />
              </div>
            ) : null}
          </>
        ) : null}
      </FormModal>
    </section>
  );
}
