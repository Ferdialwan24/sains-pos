import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FormModal } from '../../components/common/FormModal.jsx';
import { useRoleEyebrow } from '../../hooks/useRoleEyebrow.js';
import { apiRequest } from '../../lib/api.js';
import { formatCurrency } from '../../lib/format.js';
import { useToast } from '../../hooks/useToast.js';

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

export function PosPage() {
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
      } finally {
        setIsLoading(false);
      }
    };

    loadPageData();
  }, [activeOrderIdParam, tableIdParam]);

  const selectableTables = useMemo(
    () => tables.filter((table) => table.status === 'available' || table._id === selectedTableId),
    [selectedTableId, tables]
  );

  const selectedTable = tables.find((table) => table._id === selectedTableId) ?? null;
  const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const parsedCashReceived = Number(cashReceived);
  const cashChange =
    selectedPaymentMethod === PAYMENT_METHOD.CASH && Number.isFinite(parsedCashReceived)
      ? Math.max(0, parsedCashReceived - subtotal)
      : 0;

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
        customerName: response.transaction.customerName,
        invoiceNo: response.transaction.invoiceNo,
        paymentMethod: selectedPaymentMethod,
        tableLabel: getTableSummaryLabel(orderType, selectedTable),
        totalAmount: response.transaction.totalAmount,
        cashReceived:
          selectedPaymentMethod === PAYMENT_METHOD.CASH && Number.isFinite(parsedCashReceived)
            ? parsedCashReceived
            : null,
        changeAmount:
          selectedPaymentMethod === PAYMENT_METHOD.CASH && Number.isFinite(parsedCashReceived)
            ? Math.max(0, parsedCashReceived - response.transaction.totalAmount)
            : 0
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
      setIsCanceling(true);
      setErrorMessage('');

      const response = await apiRequest(`/transactions/checkout-active-order/${loadedActiveOrderId}`, {
        method: 'POST',
        body: JSON.stringify({
          status: 'cancel',
          paymentMethod: 'cash'
        })
      });

      showToast({
        title: 'Bill canceled',
        message: `Open bill was closed as ${response.transaction.status}.`,
        type: 'info'
      });
      navigate('/cashier/pos');
    } catch (error) {
      setErrorMessage(error.message);
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
      <section className="page pos-page">
        <div className="page-header">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>Point of Sale</h2>
          </div>
        <p className="muted">
          Start every new order here. Dine-in can be saved as an open bill, while takeaway goes straight to payment.
        </p>
      </div>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        <div className="content-grid">
          <div className="panel pos-menu-panel">
            <div className="panel-heading pos-menu-heading">
              <div>
                <div className="user-list-heading">
                  <h3>Product</h3>
                </div>
              </div>
            </div>
            {isLoading ? <div className="panel">Loading POS data...</div> : null}
            {!isLoading && products.length === 0 ? <div className="panel">No products available yet.</div> : null}
            <div className="card-list pos-card-list">
              {products.map((product) => {
                const quantity = orderItems.find((item) => item.productId === product._id)?.quantity ?? 0;

                return (
                  <button
                    key={product._id}
                  className={`product-card pos-product-card pos-product-button${
                    product.availability?.isAvailable === false ? ' product-card-disabled' : ''
                  }`}
                  disabled={product.availability?.isAvailable === false}
                    onClick={() => handleAddProductToOrder(product)}
                    type="button"
                  >
                    <div className="pos-product-media">
                      {quantity > 0 ? <strong className="pos-product-quantity-badge">x{quantity}</strong> : null}
                      {product.imageDataUrl ? <img alt={product.name} src={product.imageDataUrl} /> : <span>No image</span>}
                    </div>
                  <div className="pos-product-copy">
                    <h3>{product.name}</h3>
                    <div className="pos-product-meta-row">
                      <span className="pos-product-stock">
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

          <aside className="summary-card pos-summary-card">
            <div className="pos-order-header">
              <div>
                <div className="user-list-heading">
                  <h3>
                    {loadedActiveOrderId
                      ? `Loaded Bill${selectedTable ? ` - Table ${selectedTable.number}` : ''}`
                      : orderType === ORDER_TYPE.DINE_IN
                        ? 'Dine In Order'
                        : 'Takeaway Order'}
                  </h3>
                </div>
              </div>
              <div className="pos-mode-switch">
              <button
                className={`pos-mode-button${orderType === ORDER_TYPE.DINE_IN ? ' pos-mode-button-active' : ''}`}
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
                className={`pos-mode-button${orderType === ORDER_TYPE.TAKEAWAY ? ' pos-mode-button-active' : ''}`}
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

          <div className="pos-summary-body">
            <div className="pos-order-meta">
              <label className="field pos-inline-field">
                <span>Customer</span>
                <input onChange={(event) => setCustomerName(event.target.value)} value={customerName} />
              </label>

              <label className="field pos-inline-field">
                <span>Table</span>
                <select
                  disabled={orderType === ORDER_TYPE.TAKEAWAY}
                  onChange={(event) => setSelectedTableId(event.target.value)}
                  value={orderType === ORDER_TYPE.TAKEAWAY ? '' : selectedTableId}
                >
                  <option value="">{getTableFieldLabel(orderType, selectedTable)}</option>
                  {orderType === ORDER_TYPE.DINE_IN
                    ? selectableTables.map((table) => (
                        <option key={table._id} value={table._id}>
                          Table {table.number}
                          {table.status === 'active' ? ' (Active)' : ''}
                        </option>
                      ))
                    : null}
                </select>
              </label>
            </div>

            <div className="pos-items-card">
              <div className="pos-summary-head">
                <p className="muted">{loadedActiveOrderId ? 'Loaded order items' : 'Current order items'}</p>
                <strong>{orderItems.length} item(s)</strong>
              </div>

              <div className="simple-list compact-list pos-order-list">
                {orderItems.length === 0 ? <p>No items selected yet.</p> : null}
                {orderItems.map((item) => (
                  <article key={item.productId} className="list-row list-row-stack pos-order-item">
                    <div>
                      <strong>{item.name}</strong>
                      <p className="muted compact-text">
                        {item.quantity} x {formatCurrency(item.price)}
                      </p>
                    </div>
                    <div className="row-actions">
                      <strong className="pos-order-line-total">{formatCurrency(item.lineTotal)}</strong>
                      <div className="quantity-control">
                        <button
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
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="button-row pos-secondary-actions">
              <button
                className="secondary-button"
                disabled={orderType === ORDER_TYPE.TAKEAWAY || isSavingBill || isLoading}
                onClick={handleSaveBill}
                type="button"
              >
                {isSavingBill ? 'Saving...' : 'Save Bill'}
              </button>
            </div>
          </div>

          <div className="summary-total">
            <span>Subtotal</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>

          <button
            className="primary-button pos-pay-button"
            disabled={isPaying || isLoading}
            onClick={openPaymentModal}
            type="button"
          >
            {isPaying ? 'Processing...' : 'Pay'}
          </button>

          {loadedActiveOrderId ? (
            <button className="ghost-button" disabled={isCanceling} onClick={handleCancelBill} type="button">
              {isCanceling ? 'Canceling...' : 'Cancel Bill'}
            </button>
          ) : null}
        </aside>
      </div>

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
        <div className="payment-modal-body">
          <div className="payment-summary-card">
            <div className="payment-summary-row">
              <span>Customer</span>
              <strong>{customerName || '-'}</strong>
            </div>
            <div className="payment-summary-row">
              <span>Table</span>
              <strong>{getTableSummaryLabel(orderType, selectedTable)}</strong>
            </div>
            <div className="payment-summary-row">
              <span>Total</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
          </div>

          <div className="payment-method-group">
            <p className="payment-group-title">Payment Method</p>
            <div className="payment-method-switch">
              <button
                className={`payment-method-button${
                  selectedPaymentMethod === PAYMENT_METHOD.CASH ? ' payment-method-button-active' : ''
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
                className={`payment-method-button${
                  selectedPaymentMethod === PAYMENT_METHOD.QR ? ' payment-method-button-active' : ''
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
                className={`payment-method-button${
                  selectedPaymentMethod === PAYMENT_METHOD.CARD ? ' payment-method-button-active' : ''
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
            <div className="payment-cash-group">
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
        footer={
          <button
            className="primary-button"
            onClick={() => setSuccessPayment(null)}
            type="button"
          >
            Close
          </button>
        }
        isOpen={Boolean(successPayment)}
        onClose={() => setSuccessPayment(null)}
        title="Transaction Successful"
      >
        {successPayment ? (
          <div className="payment-success-body">
            <div className="payment-success-card">
              <div className="payment-summary-row">
                <span>Customer</span>
                <strong>{successPayment.customerName}</strong>
              </div>
              <div className="payment-summary-row">
                <span>Table</span>
                <strong>{successPayment.tableLabel}</strong>
              </div>
              <div className="payment-summary-row">
                <span>Invoice</span>
                <strong>{successPayment.invoiceNo}</strong>
              </div>
              <div className="payment-summary-row">
                <span>Method</span>
                <strong className="capitalize-text">{successPayment.paymentMethod}</strong>
              </div>
              <div className="payment-summary-row">
                <span>Total</span>
                <strong>{formatCurrency(successPayment.totalAmount)}</strong>
              </div>
              {successPayment.paymentMethod === PAYMENT_METHOD.CASH && successPayment.cashReceived !== null ? (
                <div className="payment-summary-row">
                  <span>Cash Received</span>
                  <strong>{formatCurrency(successPayment.cashReceived)}</strong>
                </div>
              ) : null}
              {successPayment.paymentMethod === PAYMENT_METHOD.CASH && successPayment.changeAmount > 0 ? (
                <div className="payment-summary-row payment-change-row">
                  <span>Change</span>
                  <strong>{formatCurrency(successPayment.changeAmount)}</strong>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </FormModal>
    </section>
  );
}
