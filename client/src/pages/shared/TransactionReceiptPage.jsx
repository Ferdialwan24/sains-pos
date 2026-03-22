import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../../lib/api.js';
import { formatCurrency, formatDateTime } from '../../lib/format.js';

export function TransactionReceiptPage() {
  const { transactionId } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadTransaction = async () => {
      try {
        const response = await apiRequest(`/transactions/${transactionId}`);
        setTransaction(response.transaction);
        setErrorMessage('');
      } catch (error) {
        setErrorMessage(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadTransaction();
  }, [transactionId]);

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Receipt</p>
          <h2>Transaction Detail</h2>
        </div>
        <div className="button-row">
          <Link className="secondary-button" to="/cashier/transactions">
            Back
          </Link>
          <button className="primary-button" onClick={() => window.print()} type="button">
            Print
          </button>
        </div>
      </div>

      <div className="panel receipt-panel">
        {isLoading ? <p>Loading transaction...</p> : null}
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        {!isLoading && !errorMessage && transaction ? (
          <>
            <div className="receipt-header">
              <div>
                <h3>Sains POS</h3>
                <p className="muted compact-text">Invoice {transaction.invoiceNo}</p>
              </div>
              <div className="receipt-meta">
                <span>{formatDateTime(transaction.createdAt)}</span>
                <span className="capitalize-text">{transaction.status}</span>
              </div>
            </div>

            <div className="receipt-grid">
              <article className="list-row">
                <span>Customer</span>
                <strong>{transaction.customerName}</strong>
              </article>
              <article className="list-row">
                <span>Table</span>
                <strong>{transaction.tableNumber}</strong>
              </article>
              <article className="list-row">
                <span>Cashier</span>
                <strong>{transaction.cashier?.fullName ?? '-'}</strong>
              </article>
              <article className="list-row">
                <span>Payment</span>
                <strong className="capitalize-text">{transaction.paymentMethod}</strong>
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

            {transaction.cancelReason ? (
              <p className="form-error">Cancel reason: {transaction.cancelReason}</p>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
