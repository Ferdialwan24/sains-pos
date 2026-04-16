import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FormModal } from '../../components/common/FormModal.jsx';
import { IconButton } from '../../components/common/IconButton.jsx';
import { useRoleEyebrow } from '../../hooks/useRoleEyebrow.js';
import { apiRequest } from '../../lib/api.js';
import { formatCurrency } from '../../lib/format.js';
import { DEFAULT_PRODUCT_IMAGE } from '../../lib/productImage.js';
import { useToast } from '../../hooks/useToast.js';
import styles from './POS.module.css';

const ORDER_TYPE = {
  DINE_IN: 'dine_in',
  TAKEAWAY: 'takeaway'
};

const PAYMENT_METHOD = {
  CASH: 'cash',
  QR: 'qr',
  CARD: 'card'
};

const normalizeOrderItem = (item) => ({
  productId: String(item.product?._id ?? item.product),
  name: item.name,
  price: item.price,
  quantity: Number(item.quantity),
  lineTotal: item.price * Number(item.quantity)
});

const getTableFieldLabel = (orderType, table) =>
  orderType === ORDER_TYPE.TAKEAWAY ? 'Takeaway' : table ? `Table ${table.number}` : 'Select a table';

const getTableSummaryLabel = (orderType, table) =>
  orderType === ORDER_TYPE.TAKEAWAY ? 'Takeaway' : table ? `Table ${table.number}` : '-';

export function POSPageComponent() {
  const eyebrow = useRoleEyebrow('Cashier');
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const activeOrderIdParam = searchParams.get('activeOrderId');
  const tableIdParam = searchParams.get('tableId');
  const [products, setProducts] = useState([]);
  const [tables, setTables] = useState([]);
  const [orderType, setOrderType] = useState(ORDER_TYPE.DINE_IN);
  const [customerName, setCustomerName] = useState('');
  const [selectedTableId, setSelectedTableId] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  const [loadedActiveOrderId, setLoadedActiveOrderId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBill, setIsSavingBill] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelErrorMessage, setCancelErrorMessage] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(PAYMENT_METHOD.CASH);
  const [cashReceived, setCashReceived] = useState('');
  const [paymentErrorMessage, setPaymentErrorMessage] = useState('');
  const [successPayment, setSuccessPayment] = useState(null);

  const resetDraft = () => {
    setOrderType(ORDER_TYPE.DINE_IN);
    setCustomerName('');
    setSelectedTableId('');
    setOrderItems([]);
    setLoadedActiveOrderId('');
  };

  useEffect(() => {
    const loadPageData = async () => {
      setIsLoading(true);

      try {
        const [productsResponse, tablesResponse] = await Promise.all([apiRequest('/products'), apiRequest('/tables')]);

        setProducts(productsResponse.products);
        setTables(tablesResponse.tables);

        if (activeOrderIdParam) {
          const activeOrderResponse = await apiRequest(`/active-orders/${activeOrderIdParam}`);
          const activeOrder = activeOrderResponse.activeOrder;

          setLoadedActiveOrderId(activeOrder._id);
          setOrderType(activeOrder.orderType ?? ORDER_TYPE.DINE_IN);
          setCustomerName(activeOrder.customerName ?? '');
          setSelectedTableId(String(activeOrder.table?._id ?? activeOrder.table ?? ''));
          setOrderItems((activeOrder.items ?? []).map(normalizeOrderItem));
        } else {
          resetDraft();

          if (tableIdParam) {
            setSelectedTableId(tableIdParam);
          }
        }

        setErrorMessage('');
      } catch (error) {
        setErrorMessage(error.message);
        showToast({
          title: 'POS load failed',
          message: error.message,
          type: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPageData();
  }, [activeOrderIdParam, showToast, tableIdParam]);

  const selectedTable = tables.find((table) => table._id === selectedTableId) ?? null;
  const selectableTables = useMemo(
    () => tables.filter((table) => table.status === 'available'),
    [tables]
  );
  const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const parsedCashReceived = Number(cashReceived);

  const validateDraft = ({ requireTable = orderType === ORDER_TYPE.DINE_IN } = {}) => {
    if (!customerName.trim()) {
      throw new Error('Customer name is required');
    }

    if (orderItems.length === 0) {
      throw new Error('Select at least one product item');
    }

    if (requireTable && !selectedTableId) {
      throw new Error('Table is required for dine-in orders');
    }
  };

  const setProductQuantity = (product, nextQuantity) => {
    const maxOrderQuantity = product?.availability?.maxOrderQuantity;
    const boundedQuantity =
      maxOrderQuantity === null || maxOrderQuantity === undefined
        ? nextQuantity
        : Math.min(nextQuantity, maxOrderQuantity);
    const safeQuantity = Math.max(0, boundedQuantity);

    setOrderItems((currentItems) => {
      const existingIndex = currentItems.findIndex((item) => item.productId === product._id);

      if (safeQuantity === 0) {
        return currentItems.filter((item) => item.productId !== product._id);
      }

      const nextItem = {
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: safeQuantity,
        lineTotal: product.price * safeQuantity
      };

      if (existingIndex === -1) {
        return [...currentItems, nextItem];
      }

      return currentItems.map((item, index) => (index === existingIndex ? nextItem : item));
    });
  };

  const handleAddProductToOrder = (product) => {
    if (product.availability?.isAvailable === false) {
      return;
    }

    const currentQuantity = orderItems.find((item) => item.productId === product._id)?.quantity ?? 0;
    setProductQuantity(product, currentQuantity + 1);
  };

  const handleRemoveProductFromOrder = (productId) => {
    setOrderItems((currentItems) => currentItems.filter((item) => item.productId !== productId));
  };

  const syncLoadedActiveOrder = async () => {
    if (!loadedActiveOrderId) {
      return null;
    }

    return apiRequest(`/active-orders/${loadedActiveOrderId}`, {
      method: 'PUT',
      body: JSON.stringify({
        customerName,
        tableId: selectedTableId || null,
        items: orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      })
    });
  };

  const resetPaymentFlow = () => {
    setSelectedPaymentMethod(PAYMENT_METHOD.CASH);
    setCashReceived('');
    setPaymentErrorMessage('');
    setIsPaymentModalOpen(false);
  };

  const handleSaveBill = async () => {
    try {
      validateDraft({ requireTable: true });
      setIsSavingBill(true);
      setErrorMessage('');

      if (loadedActiveOrderId) {
        await syncLoadedActiveOrder();
      } else {
        await apiRequest('/active-orders', {
          method: 'POST',
          body: JSON.stringify({
            orderType: ORDER_TYPE.DINE_IN,
            customerName,
            tableId: selectedTableId,
            items: orderItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity
            }))
          })
        });
      }

      showToast({
        title: 'Bill saved',
        message: `Open bill for ${customerName} is now attached to table ${selectedTable?.number}.`,
        type: 'success'
      });
      resetDraft();
      navigate('/cashier/pos', { replace: true });
    } catch (error) {
      setErrorMessage(error.message);
      showToast({
        title: 'Save bill failed',
        message: error.message,
        type: 'error'
      });
    } finally {
      setIsSavingBill(false);
    }
  };

  const openPaymentModal = () => {
    try {
      validateDraft();
      setPaymentErrorMessage('');
      setSelectedPaymentMethod(PAYMENT_METHOD.CASH);
      setCashReceived('');
      setIsPaymentModalOpen(true);
    } catch (error) {
      setErrorMessage(error.message);
      showToast({
        title: 'Payment failed',
        message: error.message,
        type: 'error'
      });
    }
  };

  const handlePay = async () => {
    try {
      validateDraft();

      if (selectedPaymentMethod === PAYMENT_METHOD.CASH) {
        if (!cashReceived.trim()) {
          throw new Error('Cash amount is required');
        }

        if (!Number.isFinite(parsedCashReceived) || parsedCashReceived < subtotal) {
          throw new Error('Cash amount must be equal to or greater than the transaction total');
        }
      }

      setIsPaying(true);
      setErrorMessage('');
      setPaymentErrorMessage('');

      let response;
      const changeAmount =
        selectedPaymentMethod === PAYMENT_METHOD.CASH ? Math.max(0, parsedCashReceived - subtotal) : null;

      if (loadedActiveOrderId) {
        await syncLoadedActiveOrder();
        response = await apiRequest(`/transactions/checkout-active-order/${loadedActiveOrderId}`, {
          method: 'POST',
          body: JSON.stringify({
            status: 'paid',
            paymentMethod: selectedPaymentMethod
          })
        });
      } else {
        response = await apiRequest('/transactions/checkout-direct', {
          method: 'POST',
          body: JSON.stringify({
            orderType,
            customerName,
            tableId: orderType === ORDER_TYPE.DINE_IN ? selectedTableId : null,
            items: orderItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity
            })),
            status: 'paid',
            paymentMethod: selectedPaymentMethod
          })
        });
      }

      const nextSuccessPayment = {
        invoiceNo: response.transaction.invoiceNo,
        totalAmount: response.transaction.totalAmount,
        changeAmount
      };

      resetDraft();
      resetPaymentFlow();
      setSuccessPayment(nextSuccessPayment);
      navigate('/cashier/pos', { replace: true });
    } catch (error) {
      setPaymentErrorMessage(error.message);
    } finally {
      setIsPaying(false);
    }
  };

  const handleCancelBill = async () => {
    if (!loadedActiveOrderId) {
      return;
    }

    try {
      if (!cancelReason.trim()) {
        throw new Error('Cancel reason is required');
      }

      setIsCanceling(true);
      setErrorMessage('');
      setCancelErrorMessage('');

      const response = await apiRequest(`/transactions/checkout-active-order/${loadedActiveOrderId}`, {
        method: 'POST',
        body: JSON.stringify({
          status: 'cancel',
          paymentMethod: '-',
          cancelReason: cancelReason.trim()
        })
      });

      showToast({
        title: 'Bill canceled',
        message: `Open bill was closed as ${response.transaction.status}.`,
        type: 'info'
      });
      setIsCancelModalOpen(false);
      setCancelReason('');
      resetDraft();
      navigate('/cashier/pos', { replace: true });
    } catch (error) {
      setCancelErrorMessage(error.message);
      showToast({
        title: 'Cancel bill failed',
        message: error.message,
        type: 'error'
      });
    } finally {
      setIsCanceling(false);
    }
  };

    return (
      <section className={`page ${styles.page}`}>
        <div className={`page-header ${styles.pageHeader}`}>
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>Point of Sale</h2>
          </div>
      </div>

        <div className={`content-grid ${styles.contentGrid}`}>
          <div className={`panel ${styles.menuPanel}`}>
            <div className={`panel-heading ${styles.menuHeading}`}>
              <div>
                <div className="user-list-heading">
                  <h3>Product</h3>
                </div>
              </div>
            </div>
            {isLoading ? <div className="panel">Loading POS data...</div> : null}
            {!isLoading && products.length === 0 ? <div className="panel">No products available yet.</div> : null}
            <div className={`card-list ${styles.cardList}`}>
              {products.map((product) => {
                const quantity = orderItems.find((item) => item.productId === product._id)?.quantity ?? 0;

                return (
                  <button
                    key={product._id}
                  className={`product-card ${styles.productCard} ${styles.productButton}${
                    product.availability?.isAvailable === false ? ` ${styles.productCardDisabled}` : ''
                  }`}
                  disabled={product.availability?.isAvailable === false}
                    onClick={() => handleAddProductToOrder(product)}
                    type="button"
                  >
                    <div className={styles.productMedia}>
                      {quantity > 0 ? <strong className={styles.quantityBadge}>x{quantity}</strong> : null}
                      <img alt={product.name} src={product.imageDataUrl || DEFAULT_PRODUCT_IMAGE} />
                    </div>
                  <div className={styles.productCopy}>
                    <h3>{product.name}</h3>
                    <div className={styles.productMetaRow}>
                      <span className={styles.productStock}>
                        {product.trackInventory ? `${product.inventoryQuantity ?? 0} ${product.inventoryUnit ?? ''}`.trim() : ''}
                      </span>
                      <strong>{formatCurrency(product.price)}</strong>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

          <aside className={`summary-card ${styles.summaryCard}`}>
            <div className={styles.orderHeader}>
              <div>
                <div className="user-list-heading">
                  <h3>
                    {orderType === ORDER_TYPE.DINE_IN ? 'Dine In Order' : 'Takeaway Order'}
                  </h3>
                </div>
              </div>
              <div className={styles.modeSwitch}>
              <button
                className={`${styles.modeButton}${orderType === ORDER_TYPE.DINE_IN ? ` ${styles.modeButtonActive}` : ''}`}
                disabled={Boolean(loadedActiveOrderId)}
                onClick={() => {
                  setOrderType(ORDER_TYPE.DINE_IN);
                  setSelectedTableId((current) => current || tableIdParam || '');
                }}
                type="button"
              >
                Dine In
              </button>
              <button
                className={`${styles.modeButton}${orderType === ORDER_TYPE.TAKEAWAY ? ` ${styles.modeButtonActive}` : ''}`}
                disabled={Boolean(loadedActiveOrderId)}
                onClick={() => {
                  setOrderType(ORDER_TYPE.TAKEAWAY);
                  setSelectedTableId('');
                }}
                type="button"
              >
                Takeaway
              </button>
            </div>
          </div>

          <div className={styles.summaryBody}>
            <div className={styles.orderMeta}>
              <label className={`field ${styles.inlineField}`}>
                <span>Customer</span>
                <input onChange={(event) => setCustomerName(event.target.value)} value={customerName} />
              </label>

              <label className={`field ${styles.inlineField}`}>
                <span>Table</span>
                <select
                  disabled={orderType === ORDER_TYPE.TAKEAWAY || Boolean(loadedActiveOrderId)}
                  onChange={(event) => setSelectedTableId(event.target.value)}
                  value={orderType === ORDER_TYPE.TAKEAWAY ? '' : selectedTableId}
                >
                  {orderType === ORDER_TYPE.TAKEAWAY ? (
                    <option value="">{getTableFieldLabel(orderType, selectedTable)}</option>
                  ) : loadedActiveOrderId && selectedTableId ? (
                    <option value={selectedTableId}>{getTableFieldLabel(orderType, selectedTable)}</option>
                  ) : !selectedTableId ? (
                    <option value="">{getTableFieldLabel(orderType, selectedTable)}</option>
                  ) : !selectableTables.some((table) => table._id === selectedTableId) ? (
                    <option hidden value={selectedTableId}>
                      {getTableFieldLabel(orderType, selectedTable)}
                    </option>
                  ) : null}
                  {orderType === ORDER_TYPE.DINE_IN
                    ? selectableTables.map((table) => (
                        <option key={table._id} value={table._id}>
                          Table {table.number}
                        </option>
                      ))
                    : null}
                </select>
              </label>
            </div>

            <div className={styles.itemsCard}>
              <div className={styles.summaryHead}>
                <p className="muted">Order items</p>
                <strong>{orderItems.length} item(s)</strong>
              </div>

              <div className={`simple-list compact-list ${styles.orderList}`}>
                {orderItems.length === 0 ? <p>No items selected yet.</p> : null}
                {orderItems.map((item) => (
                  <article key={item.productId} className={`list-row list-row-stack ${styles.orderItem}`}>
                    <div>
                      <strong>{item.name}</strong>
                      <p className="muted compact-text">
                        {item.quantity} x {formatCurrency(item.price)}
                      </p>
                    </div>
                    <div className={`row-actions ${styles.orderActions}`}>
                      <strong className={styles.orderLineTotal}>{formatCurrency(item.lineTotal)}</strong>
                      <div className="quantity-control">
                        <button
                          disabled={item.quantity <= 1}
                          onClick={() => {
                            const product = products.find((entry) => entry._id === item.productId);

                            if (product) {
                              setProductQuantity(product, item.quantity - 1);
                            }
                          }}
                          type="button"
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() => {
                            const product = products.find((entry) => entry._id === item.productId);

                            if (product) {
                              setProductQuantity(product, item.quantity + 1);
                            }
                          }}
                          type="button"
                        >
                          +
                        </button>
                      </div>
                      <IconButton
                        icon="delete"
                        label={`Remove ${item.name}`}
                        onClick={() => handleRemoveProductFromOrder(item.productId)}
                        variant="danger"
                      />
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className={`button-row ${styles.secondaryActions}`}>
              <button
                className="secondary-button"
                disabled={orderType === ORDER_TYPE.TAKEAWAY || isSavingBill || isLoading}
                onClick={handleSaveBill}
                type="button"
              >
                {isSavingBill ? 'Saving...' : 'Save Bill'}
              </button>
              {loadedActiveOrderId ? (
                <button
                  className="ghost-button"
                  disabled={isCanceling || isLoading}
                  onClick={() => {
                    setCancelErrorMessage('');
                    setIsCancelModalOpen(true);
                  }}
                  type="button"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </div>

          <div className="summary-total">
            <span>Subtotal</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>

          <button
            className={`primary-button ${styles.payButton}`}
            disabled={isPaying || isLoading}
            onClick={openPaymentModal}
            type="button"
          >
            {isPaying ? 'Processing...' : 'Pay'}
          </button>
        </aside>
      </div>

      <FormModal
        footer={
          <>
            <button
              className="secondary-button"
              onClick={() => {
                if (isCanceling) {
                  return;
                }

                setIsCancelModalOpen(false);
                setCancelReason('');
                setCancelErrorMessage('');
              }}
              type="button"
            >
              Close
            </button>
            <button className="ghost-button" disabled={isCanceling} onClick={handleCancelBill} type="button">
              {isCanceling ? 'Canceling...' : 'Confirm Cancel'}
            </button>
          </>
        }
        hideHeader
        isOpen={isCancelModalOpen}
        onClose={() => {
          if (isCanceling) {
            return;
          }

          setIsCancelModalOpen(false);
          setCancelReason('');
          setCancelErrorMessage('');
        }}
        title="Cancel Bill"
      >
        <div className={styles.cancelModalBody}>
          <label className="field">
            <span>Cancel Reason</span>
            <input
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Enter reason for canceling this bill"
              type="text"
              value={cancelReason}
            />
          </label>
          {cancelErrorMessage ? <p className="form-error">{cancelErrorMessage}</p> : null}
        </div>
      </FormModal>

      <FormModal
        footer={
          <>
            <button className="secondary-button" onClick={resetPaymentFlow} type="button">
              Cancel
            </button>
            <button className="primary-button" disabled={isPaying} onClick={handlePay} type="button">
              {isPaying ? 'Processing...' : 'Pay'}
            </button>
          </>
        }
        isOpen={isPaymentModalOpen}
        onClose={resetPaymentFlow}
        title="Payment"
      >
        <div className={styles.paymentModalBody}>
          <div className={styles.paymentSummaryCard}>
            <div className={styles.paymentSummaryRow}>
              <span>Customer</span>
              <strong>{customerName || '-'}</strong>
            </div>
            <div className={styles.paymentSummaryRow}>
              <span>Table</span>
              <strong>{getTableSummaryLabel(orderType, selectedTable)}</strong>
            </div>
            <div className={styles.paymentSummaryRow}>
              <span>Total</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
          </div>

          <div className={styles.paymentMethodGroup}>
            <p className={styles.paymentGroupTitle}>Payment Method</p>
            <div className={styles.paymentMethodSwitch}>
              <button
                className={`${styles.paymentMethodButton}${
                  selectedPaymentMethod === PAYMENT_METHOD.CASH ? ` ${styles.paymentMethodButtonActive}` : ''
                }`}
                onClick={() => {
                  setSelectedPaymentMethod(PAYMENT_METHOD.CASH);
                  setPaymentErrorMessage('');
                }}
                type="button"
              >
                Cash
              </button>
              <button
                className={`${styles.paymentMethodButton}${
                  selectedPaymentMethod === PAYMENT_METHOD.QR ? ` ${styles.paymentMethodButtonActive}` : ''
                }`}
                onClick={() => {
                  setSelectedPaymentMethod(PAYMENT_METHOD.QR);
                  setPaymentErrorMessage('');
                }}
                type="button"
              >
                QR
              </button>
              <button
                className={`${styles.paymentMethodButton}${
                  selectedPaymentMethod === PAYMENT_METHOD.CARD ? ` ${styles.paymentMethodButtonActive}` : ''
                }`}
                onClick={() => {
                  setSelectedPaymentMethod(PAYMENT_METHOD.CARD);
                  setPaymentErrorMessage('');
                }}
                type="button"
              >
                Card
              </button>
            </div>
          </div>

          {selectedPaymentMethod === PAYMENT_METHOD.CASH ? (
            <div className={styles.paymentCashGroup}>
              <label className="field">
                <span>Cash Received</span>
                <input
                  inputMode="decimal"
                  onChange={(event) => setCashReceived(event.target.value)}
                  placeholder="Enter cash amount"
                  value={cashReceived}
                />
              </label>
              <div className="button-row">
                <button
                  className="secondary-button"
                  onClick={() => setCashReceived(subtotal ? String(subtotal) : '')}
                  type="button"
                >
                  Exact Cash
                </button>
              </div>
            </div>
          ) : null}

          {paymentErrorMessage ? <p className="form-error">{paymentErrorMessage}</p> : null}
        </div>
      </FormModal>

      <FormModal
        cardClassName={styles.successModal}
        footer={
          <button
            className="primary-button"
            onClick={() => setSuccessPayment(null)}
            type="button"
          >
            Close
          </button>
        }
        hideHeader
        isOpen={Boolean(successPayment)}
        onClose={() => setSuccessPayment(null)}
        title="Payment Successful"
      >
        {successPayment ? (
          <div className={styles.paymentSuccessBody}>
            <div className={styles.paymentSuccessCard}>
              <div className={styles.paymentSuccessInvoice}>
                <span>Invoice</span>
                <strong>{successPayment.invoiceNo}</strong>
              </div>
              <div className={styles.paymentSuccessAnimation} aria-hidden="true">
                <div className={styles.paymentSuccessPulse} />
                <div className={styles.paymentSuccessIcon}>
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M9.55 16.35 5.7 12.5l1.4-1.4 2.45 2.45 7.35-7.35 1.4 1.4-8.75 8.75Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              </div>
              <div className={styles.paymentSuccessCopy}>
                <span>Payment Successful</span>
                <strong>{formatCurrency(successPayment.totalAmount)}</strong>
                {successPayment.changeAmount && successPayment.changeAmount > 0 ? (
                  <div className={styles.paymentSuccessChange}>
                    <span>Change</span>
                    <strong>{formatCurrency(successPayment.changeAmount)}</strong>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </FormModal>
    </section>
  );
}
