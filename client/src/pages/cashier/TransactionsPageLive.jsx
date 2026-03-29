import { useEffect, useMemo, useState } from 'react';
import { FormModal } from '../../components/common/FormModal.jsx';
import { IconButton } from '../../components/common/IconButton.jsx';
import { apiRequest } from '../../lib/api.js';
import { getPresetDateRange } from '../../lib/dateRange.js';
import { downloadReceiptPdf } from '../../lib/downloads.js';
import { formatCurrency, formatDateTime } from '../../lib/format.js';

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

const ReceiptContent = ({ transaction }) => {
  if (!transaction) {
    return null;
  }

  return (
    <div className="receipt-panel receipt-modal-panel">
      <div className="receipt-header">
        <div>
          <h3>Sains POS</h3>
          <p className="muted compact-text">Invoice {transaction.invoiceNo}</p>
          <p className="muted compact-text">Customer {transaction.customerName}</p>
          <p className="muted compact-text">Table {transaction.tableNumber}</p>
          <p className="muted compact-text">Served by {transaction.cashier?.fullName ?? '-'}</p>
        </div>
        <div className="receipt-meta">
          <span>{formatDateTime(transaction.createdAt)}</span>
          <span className="capitalize-text">{transaction.status}</span>
        </div>
      </div>

      <div className="receipt-grid">
        <article className="list-row">
          <span>Payment Method</span>
          <strong className="capitalize-text">{transaction.paymentMethod}</strong>
        </article>
        <article className="list-row">
          <span>Total Amount</span>
          <strong>{formatCurrency(transaction.totalAmount)}</strong>
        </article>
      </div>

      <div className="simple-list">
        {transaction.items.map((item) => (
          <article key={`${transaction._id}-${item.product}`} className="list-row">
            <div>
              <strong>{item.name}</strong>
              <p className="muted compact-text">
                {item.quantity} x {formatCurrency(item.price)}
              </p>
            </div>
            <span>{formatCurrency(item.lineTotal)}</span>
          </article>
        ))}
      </div>

      <div className="summary-total">
        <span>Total</span>
        <strong>{formatCurrency(transaction.totalAmount)}</strong>
      </div>
    </div>
  );
};

export function TransactionsPageLive() {
  const [transactions, setTransactions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [detailTransaction, setDetailTransaction] = useState(null);
  const [receiptTransaction, setReceiptTransaction] = useState(null);
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

  const closeReceiptModal = () => {
    setReceiptTransaction(null);
  };

  const handleOpenReceipt = (transaction) => {
    setReceiptTransaction(transaction);
  };

  const handleOpenReceiptFromDetail = () => {
    if (!detailTransaction) {
      return;
    }

    const transaction = detailTransaction;
    closeDetailModal();
    setReceiptTransaction(transaction);
  };

  const isDetailModalOpen = Boolean(activeTransactionId);

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Cashier</p>
          <h2>Transactions</h2>
        </div>
        <p className="muted">Final transactions are shown here with payment and cashier details.</p>
      </div>

      <div className="panel transaction-filter-panel">
        <div className="transaction-filter-groups">
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
        </div>
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      </div>

      <div className="panel">
        <div className="panel-heading user-list-heading">
          <h3>Transaction List</h3>
        </div>
        {isLoading ? <p>Loading transactions...</p> : null}
        {!isLoading && transactions.length === 0 ? <p>No transactions yet.</p> : null}
        <div className="report-table transaction-table">
          {transactions.length > 0 ? (
            <article className="report-row report-row-header transaction-row transaction-row-header">
              <strong>Invoice No</strong>
              <strong>Status Payment</strong>
              <strong>Amount</strong>
              <strong>Details</strong>
            </article>
          ) : null}
          {transactions.map((transaction) => (
            <article key={transaction._id} className="report-row transaction-row">
              <strong>{transaction.invoiceNo}</strong>
              <span className={`pill ${transaction.status === 'paid' ? 'pill-success' : 'pill-cancel'}`}>
                {transaction.status}
              </span>
              <span>{formatCurrency(transaction.totalAmount)}</span>
              <div className="row-actions transaction-row-actions">
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
            <button
              className="primary-button"
              disabled={!detailTransaction}
              onClick={handleOpenReceiptFromDetail}
              type="button"
            >
              Receipt
            </button>
          </>
        }
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        title="Transaction Detail"
      >
        {isDetailLoading ? <p>Loading transaction detail...</p> : null}
        {detailErrorMessage ? <p className="form-error">{detailErrorMessage}</p> : null}
        {!isDetailLoading && !detailErrorMessage && detailTransaction ? <ReceiptContent transaction={detailTransaction} /> : null}
      </FormModal>

      <FormModal
        footer={
          <>
            <button className="secondary-button" onClick={closeReceiptModal} type="button">
              Close
            </button>
            <button
              className="primary-button"
              disabled={!receiptTransaction}
              onClick={() => downloadReceiptPdf(receiptTransaction)}
              type="button"
            >
              Download PDF
            </button>
          </>
        }
        isOpen={Boolean(receiptTransaction)}
        onClose={closeReceiptModal}
        title={receiptTransaction ? `Receipt ${receiptTransaction.invoiceNo}` : 'Receipt'}
      >
        <ReceiptContent transaction={receiptTransaction} />
      </FormModal>
    </section>
  );
}

