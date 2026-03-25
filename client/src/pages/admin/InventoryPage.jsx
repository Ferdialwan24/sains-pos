import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../hooks/useToast.js';
import { apiRequest } from '../../lib/api.js';

const defaultForm = {
  search: '',
  productId: '',
  quantity: '',
  unit: 'pcs'
};

export function InventoryPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(defaultForm);
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

  const filteredItems = useMemo(
    () =>
      items.filter((item) => item.name.toLowerCase().includes(form.search.trim().toLowerCase())),
    [form.search, items]
  );

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
      setForm(defaultForm);
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
          <p className="eyebrow">Admin</p>
          <h2>Inventory</h2>
        </div>
        <p className="muted">Only products with active inventory tracking appear here.</p>
      </div>

      <form className="panel inventory-toolbar" onSubmit={handleSubmit}>
        <div className="panel-heading">
          <h3>Add Stock</h3>
          <span className="panel-count">{items.length} tracked products</span>
        </div>
        <div className="inventory-toolbar-grid">
          <label className="field">
            <span>Search product</span>
            <input
              onChange={(event) => setForm((currentForm) => ({ ...currentForm, search: event.target.value }))}
              placeholder="Search tracked product"
              value={form.search}
            />
          </label>
          <label className="field">
            <span>Matched product</span>
            <select
              onChange={(event) => setForm((currentForm) => ({ ...currentForm, productId: event.target.value }))}
              required
              value={form.productId}
            >
              <option value="">Select product</option>
              {filteredItems.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
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
            <select onChange={(event) => setForm((currentForm) => ({ ...currentForm, unit: event.target.value }))} value={form.unit}>
              <option value="pcs">pcs</option>
              <option value="gr">gr</option>
              <option value="ml">ml</option>
            </select>
          </label>
        </div>
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        <div className="button-row">
          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Updating...' : 'Add Stock'}
          </button>
        </div>
      </form>

      <div className="panel">
        <div className="panel-heading">
          <h3>Tracked Products</h3>
          <span className="panel-count">{filteredItems.length} visible</span>
        </div>
        {isLoading ? <p>Loading inventory...</p> : null}
        {!isLoading && items.length === 0 ? <p>No tracked products yet. Enable inventory tracking from Products.</p> : null}
        <div className="inventory-list">
          {filteredItems.map((item) => (
            <article key={item._id} className="inventory-row">
              <div className="inventory-row-image">
                {item.imageDataUrl ? <img alt={item.name} src={item.imageDataUrl} /> : <span>No image</span>}
              </div>
              <div className="inventory-row-copy">
                <strong>{item.name}</strong>
                <span>
                  {item.inventoryQuantity} {item.inventoryUnit}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

