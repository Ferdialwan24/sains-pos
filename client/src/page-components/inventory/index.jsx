import { useEffect, useMemo, useState } from 'react';
import { FormModal } from '../../components/common/FormModal.jsx';
import { useRoleEyebrow } from '../../hooks/useRoleEyebrow.js';
import { useToast } from '../../hooks/useToast.js';
import { apiRequest } from '../../lib/api.js';
import styles from './Inventory.module.css';

const defaultForm = {
  search: '',
  productId: '',
  quantity: '',
  unit: 'pcs'
};

export function InventoryPageComponent() {
  const eyebrow = useRoleEyebrow('Admin');
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadItems = async () => {
    setIsLoading(true);

    try {
      const response = await apiRequest('/inventory');
      setItems(response.items);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const matchedItems = useMemo(() => {
    const query = form.search.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return items.filter((item) => item.name.toLowerCase().includes(query)).slice(0, 6);
  }, [form.search, items]);

  const selectedItem = useMemo(
    () => items.find((item) => item._id === form.productId) ?? null,
    [form.productId, items]
  );

  const shouldShowMatches =
    isModalOpen &&
    form.search.trim().length > 0 &&
    matchedItems.length > 0 &&
    (!selectedItem || selectedItem.name.toLowerCase() !== form.search.trim().toLowerCase());

  const handleSelectItem = (item) => {
    setForm((currentForm) => ({
      ...currentForm,
      productId: item._id,
      search: item.name,
      unit: item.inventoryUnit || currentForm.unit
    }));
  };

  const closeModal = () => {
    setForm(defaultForm);
    setIsModalOpen(false);
    setErrorMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await apiRequest('/inventory/restock', {
        method: 'POST',
        body: JSON.stringify({
          productId: form.productId,
          quantity: Number(form.quantity),
          unit: form.unit
        })
      });
      showToast({
        title: 'Stock updated',
        message: 'Product stock has been increased.',
        type: 'success'
      });
      closeModal();
      await loadItems();
    } catch (error) {
      setErrorMessage(error.message);
      showToast({
        title: 'Stock update failed',
        message: error.message,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>Inventory</h2>
        </div>
        <p className="muted">Only products with active inventory tracking appear here.</p>
      </div>

      <div className="user-list-section">
        <button className="primary-button section-action-button" onClick={() => setIsModalOpen(true)} type="button">
          Add Stock
        </button>
      </div>

      <div className="panel">
        <div className="panel-heading user-list-heading">
          <h3>Tracked Product List</h3>
        </div>
        {isLoading ? <p>Loading inventory...</p> : null}
        {!isLoading && items.length === 0 ? <p>No tracked products yet. Enable inventory tracking from Products.</p> : null}
        <div className="report-table inventory-table">
          {items.length > 0 ? (
            <article className={`report-row report-row-header product-row product-row-header ${styles.productRow}`}>
              <strong>Image</strong>
              <strong>Product Name</strong>
              <strong>QTY</strong>
              <strong>Status</strong>
              <strong>Qty Alert</strong>
            </article>
          ) : null}
          {items.map((item) => (
            <article key={item._id} className={`report-row product-row ${styles.productRow}`}>
              <div className="product-table-image">
                {item.imageDataUrl ? <img alt={item.name} src={item.imageDataUrl} /> : <span>No image</span>}
              </div>
              <div className="product-name-cell">
                <strong>{item.name}</strong>
              </div>
              <span>
                {item.inventoryQuantity} {item.inventoryUnit}
              </span>
              <span
                className={`pill ${
                  item.stockAlert?.status === 'out'
                    ? 'pill-cancel'
                    : item.stockAlert?.status === 'low'
                      ? 'pill-active'
                      : 'pill-available'
                }`}
              >
                {item.stockAlert?.status === 'out'
                  ? 'Out of Stock'
                  : item.stockAlert?.status === 'low'
                    ? 'Low Stock'
                    : 'In Stock'}
              </span>
              <span>
                {item.lowStockThreshold > 0 ? `${item.lowStockThreshold} ${item.inventoryUnit}` : '-'}
              </span>
            </article>
          ))}
        </div>
      </div>

      <FormModal
        footer={
          <>
            <button className="secondary-button" onClick={closeModal} type="button">
              Cancel
            </button>
            <button className="primary-button" disabled={isSubmitting || !form.productId} form="inventory-form" type="submit">
              {isSubmitting ? 'Updating...' : 'Add Stock'}
            </button>
          </>
        }
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Add Stock"
      >
        <form className="form-grid" id="inventory-form" onSubmit={handleSubmit}>
          <div className={`field ${styles.searchField}`}>
            <span>Search product</span>
            <input
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  search: event.target.value,
                  productId:
                    selectedItem?.name.toLowerCase() === event.target.value.trim().toLowerCase() ? currentForm.productId : ''
                }))
              }
              placeholder="Search tracked product"
              value={form.search}
            />
            {shouldShowMatches ? (
              <div className={styles.searchResults}>
                {matchedItems.map((item) => (
                  <button
                    key={item._id}
                    className={styles.searchResult}
                    onClick={() => handleSelectItem(item)}
                    type="button"
                  >
                    <strong>{item.name}</strong>
                    <span>
                      {item.inventoryQuantity} {item.inventoryUnit}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <label className="field">
            <span>Quantity</span>
            <input
              min="0"
              onChange={(event) => setForm((currentForm) => ({ ...currentForm, quantity: event.target.value }))}
              required
              type="number"
              value={form.quantity}
            />
          </label>
          <label className="field">
            <span>Unit</span>
            <select
              onChange={(event) => setForm((currentForm) => ({ ...currentForm, unit: event.target.value }))}
              value={form.unit}
            >
              <option value="pcs">pcs</option>
              <option value="gr">gr</option>
              <option value="ml">ml</option>
            </select>
          </label>
          {selectedItem ? (
            <div className={styles.selectedProduct}>
              <strong>{selectedItem.name}</strong>
              <span>
                Current stock: {selectedItem.inventoryQuantity} {selectedItem.inventoryUnit}
              </span>
            </div>
          ) : null}
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        </form>
      </FormModal>
    </section>
  );
}

