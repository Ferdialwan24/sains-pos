import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRoleEyebrow } from '../../hooks/useRoleEyebrow.js';
import { apiRequest } from '../../lib/api.js';
import { formatCurrency } from '../../lib/format.js';
import { useToast } from '../../hooks/useToast.js';

export function PosPage() {
  const eyebrow = useRoleEyebrow('Cashier');
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('tableId');
  const [table, setTable] = useState(null);
  const [products, setProducts] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [quantities, setQuantities] = useState({});
  const [existingQuantities, setExistingQuantities] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingBill, setIsUpdatingBill] = useState(false);
  const [isRemovingItemId, setIsRemovingItemId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const mapExistingQuantities = (activeOrderItems = []) =>
    activeOrderItems.reduce((accumulator, item) => {
      accumulator[String(item.product)] = item.quantity;
      return accumulator;
    }, {});

  useEffect(() => {
    const loadPageData = async () => {
      setIsLoading(true);

      try {
        const productsResponse = await apiRequest('/products');
        setProducts(productsResponse.products);

        if (tableId) {
          const tableResponse = await apiRequest(`/tables/${tableId}`);
          setTable(tableResponse.table);
          setCustomerName(tableResponse.table.activeOrder?.customerName ?? '');
          setExistingQuantities(mapExistingQuantities(tableResponse.table.activeOrder?.items));
        } else {
          setTable(null);
          setCustomerName('');
          setExistingQuantities({});
        }

        setErrorMessage('');
      } catch (error) {
        setErrorMessage(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadPageData();
  }, [tableId]);

  const updateQuantity = (productId, nextQuantity) => {
    const product = products.find((item) => item._id === productId);
    const maxOrderQuantity = product?.availability?.maxOrderQuantity;
    const boundedQuantity =
      maxOrderQuantity === null || maxOrderQuantity === undefined
        ? nextQuantity
        : Math.min(nextQuantity, maxOrderQuantity);

    setQuantities((currentState) => ({
      ...currentState,
      [productId]: Math.max(0, boundedQuantity)
    }));
  };

  const selectedItems = products
    .filter((product) => Number(quantities[product._id] ?? 0) > 0)
    .map((product) => ({
      productId: product._id,
      name: product.name,
      price: product.price,
      quantity: Number(quantities[product._id]),
      lineTotal: product.price * Number(quantities[product._id])
    }));

  const subtotal = selectedItems.reduce((sum, item) => sum + item.lineTotal, 0);

  const currentBillItems =
    table?.activeOrder?.items?.map((item) => ({
      ...item,
      quantity: Number(existingQuantities[String(item.product)] ?? item.quantity),
      lineTotal: item.price * Number(existingQuantities[String(item.product)] ?? item.quantity)
    })) ?? [];

  const updateExistingQuantity = (productId, nextQuantity) => {
    setExistingQuantities((currentState) => ({
      ...currentState,
      [productId]: Math.max(1, nextQuantity)
    }));
  };

  const reloadTable = async () => {
    if (!tableId) {
      return;
    }

    const [tableResponse, productsResponse] = await Promise.all([
      apiRequest(`/tables/${tableId}`),
      apiRequest('/products')
    ]);

    setTable(tableResponse.table);
    setProducts(productsResponse.products);
    setCustomerName(tableResponse.table.activeOrder?.customerName ?? '');
    setExistingQuantities(mapExistingQuantities(tableResponse.table.activeOrder?.items));
  };

  const handleSubmit = async () => {
    if (!tableId || selectedItems.length === 0) {
      const message = 'Select at least one product item';
      setErrorMessage(message);
      showToast({
        title: 'Cannot save bill',
        message,
        type: 'error'
      });
      return;
    }

    if (!customerName.trim()) {
      const message = 'Customer name is required';
      setErrorMessage(message);
      showToast({
        title: 'Cannot save bill',
        message,
        type: 'error'
      });
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const endpoint = table?.status === 'active' ? `/tables/${tableId}/items` : `/tables/${tableId}/open-bill`;
      await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          customerName,
          items: selectedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity
          }))
        })
      });

      showToast({
        title: table?.status === 'active' ? 'Item added to bill' : 'Bill opened',
        message:
          table?.status === 'active'
            ? `${selectedItems.length} new item(s) added for ${customerName}.`
            : `Bill for ${customerName} on table ${table?.number} is now active.`,
        type: 'success'
      });
      navigate('/cashier/tables');
    } catch (error) {
      setErrorMessage(error.message);
      showToast({
        title: 'Bill save failed',
        message: error.message,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCurrentBill = async () => {
    if (!tableId || !table?.activeOrder) {
      return;
    }

    setIsUpdatingBill(true);
    setErrorMessage('');

    try {
      await apiRequest(`/tables/${tableId}/items`, {
        method: 'PUT',
        body: JSON.stringify({
          customerName,
          items: currentBillItems.map((item) => ({
            productId: String(item.product),
            quantity: item.quantity
          }))
        })
      });

      await reloadTable();
      showToast({
        title: 'Bill updated',
        message: `Current bill for ${customerName || `table ${table?.number}`} has been updated.`,
        type: 'success'
      });
    } catch (error) {
      setErrorMessage(error.message);
      showToast({
        title: 'Bill update failed',
        message: error.message,
        type: 'error'
      });
    } finally {
      setIsUpdatingBill(false);
    }
  };

  const handleRemoveCurrentBillItem = async (productId) => {
    if (!tableId) {
      return;
    }

    setIsRemovingItemId(productId);
    setErrorMessage('');

    try {
      const removedItem = currentBillItems.find((item) => String(item.product) === productId);
      const response = await apiRequest(`/tables/${tableId}/items/${productId}`, {
        method: 'DELETE'
      });

      if (response.table?.status === 'available') {
        showToast({
          title: 'Item removed',
          message: `${removedItem?.name ?? 'The item'} was removed and the table is now empty.`,
          type: 'info'
        });
        navigate('/cashier/tables');
        return;
      }

      await reloadTable();
      showToast({
        title: 'Item removed',
        message: `${removedItem?.name ?? 'The item'} has been removed from the bill.`,
        type: 'success'
      });
    } catch (error) {
      setErrorMessage(error.message);
      showToast({
        title: 'Remove item failed',
        message: error.message,
        type: 'error'
      });
    } finally {
      setIsRemovingItemId('');
    }
  };

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>Point of Sale</h2>
        </div>
        <p className="muted">This screen opens or updates the active bill for a selected table.</p>
      </div>

      {!tableId ? (
        <div className="panel">
          Products are shown below. To create or update a bill, open this page from `Table Billing`
          so a table is selected first.
        </div>
      ) : null}
      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      <div className="content-grid">
        <div className="card-list">
          {isLoading ? <div className="panel">Loading POS data...</div> : null}
          {!isLoading && products.length === 0 ? <div className="panel">No products available yet.</div> : null}
          {products.map((product) => {
            const quantity = Number(quantities[product._id] ?? 0);

            return (
              <article
                key={product._id}
                className={`product-card${product.availability?.isAvailable === false ? ' product-card-disabled' : ''}`}
              >
                <h3>{product.name}</h3>
                <p>{formatCurrency(product.price)}</p>
                <p className="muted compact-text">
                  {product.availability?.isAvailable === false
                    ? product.availability.reason || 'Unavailable'
                    : product.availability?.maxOrderQuantity !== null &&
                        product.availability?.maxOrderQuantity !== undefined
                      ? `Ready for ${product.availability.maxOrderQuantity} order(s)`
                      : 'Always available'}
                </p>
                <div className="quantity-control">
                  <button
                    disabled={product.availability?.isAvailable === false}
                    onClick={() => updateQuantity(product._id, quantity - 1)}
                    type="button"
                  >
                    -
                  </button>
                  <span>{quantity}</span>
                  <button
                    disabled={product.availability?.isAvailable === false}
                    onClick={() => updateQuantity(product._id, quantity + 1)}
                    type="button"
                  >
                    +
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="summary-card">
          <h3>{table ? `Table ${table.number}` : 'Order Summary'}</h3>
          <label className="field">
            <span>Customer Name</span>
            <input onChange={(event) => setCustomerName(event.target.value)} value={customerName} />
          </label>
          {table?.activeOrder?.items?.length ? (
            <>
              <p className="muted">Current bill</p>
              <div className="simple-list compact-list">
                {currentBillItems.map((item) => (
                  <article key={item.product} className="list-row list-row-stack">
                    <div>
                      <strong>{item.name}</strong>
                      <p className="muted compact-text">{formatCurrency(item.lineTotal)}</p>
                    </div>
                    <div className="row-actions">
                      <div className="quantity-control">
                        <button onClick={() => updateExistingQuantity(String(item.product), item.quantity - 1)} type="button">
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateExistingQuantity(String(item.product), item.quantity + 1)} type="button">
                          +
                        </button>
                      </div>
                      <button
                        className="ghost-button small-button"
                        disabled={isRemovingItemId === String(item.product)}
                        onClick={() => handleRemoveCurrentBillItem(String(item.product))}
                        type="button"
                      >
                        {isRemovingItemId === String(item.product) ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <button
                className="secondary-button"
                disabled={isUpdatingBill}
                onClick={handleUpdateCurrentBill}
                type="button"
              >
                {isUpdatingBill ? 'Updating...' : 'Update Current Bill'}
              </button>
            </>
          ) : null}
          <p className="muted">New items</p>
          <div className="simple-list compact-list">
            {selectedItems.length === 0 ? <p>No new items selected.</p> : null}
            {selectedItems.map((item) => (
              <article key={item.productId} className="list-row">
                <span>
                  {item.name} x{item.quantity}
                </span>
                <span>{formatCurrency(item.lineTotal)}</span>
              </article>
            ))}
          </div>
          <div className="summary-total">
            <span>New subtotal</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
          <div className="button-row">
            <button className="secondary-button" onClick={() => navigate('/cashier/tables')} type="button">
              Back
            </button>
            <button className="primary-button" disabled={isSubmitting || isLoading} onClick={handleSubmit} type="button">
              {isSubmitting ? 'Saving...' : table?.status === 'active' ? 'Add to Bill' : 'Open Bill'}
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
