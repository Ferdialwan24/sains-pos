import { useEffect, useMemo, useState } from 'react';
import { FormModal } from '../../components/common/FormModal.jsx';
import { apiRequest } from '../../lib/api.js';
import { useToast } from '../../hooks/useToast.js';

const defaultForm = {
  name: '',
  quantity: '',
  unit: ''
};

export function InventoryPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [editingItemId, setEditingItemId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const formTitle = useMemo(() => (editingItemId ? 'Edit Inventory Item' : 'Add Inventory Item'), [editingItemId]);

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

  const closeModal = () => {
    setForm(defaultForm);
    setEditingItemId(null);
    setIsModalOpen(false);
    setErrorMessage('');
  };

  const handleOpenCreate = () => {
    setForm(defaultForm);
    setEditingItemId(null);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleChange = (event) => {
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.value
    }));
  };

  const handleEdit = (item) => {
    setEditingItemId(item._id);
    setForm({
      name: item.name,
      quantity: String(item.quantity),
      unit: item.unit
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        name: form.name,
        quantity: Number(form.quantity),
        unit: form.unit
      };

      if (editingItemId) {
        await apiRequest(`/inventory/${editingItemId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        showToast({
          title: 'Inventory updated',
          message: `${payload.name} has been updated.`,
          type: 'success'
        });
      } else {
        await apiRequest('/inventory', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        showToast({
          title: 'Inventory item created',
          message: `${payload.name} has been added to stock.`,
          type: 'success'
        });
      }

      closeModal();
      await loadItems();
    } catch (error) {
      setErrorMessage(error.message);
      showToast({
        title: 'Inventory save failed',
        message: error.message,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (itemId) => {
    const confirmed = window.confirm('Delete this inventory item?');

    if (!confirmed) {
      return;
    }

    try {
      const deletedItem = items.find((item) => item._id === itemId);
      await apiRequest(`/inventory/${itemId}`, {
        method: 'DELETE'
      });

      await loadItems();
      showToast({
        title: 'Inventory item deleted',
        message: `${deletedItem?.name ?? 'The inventory item'} has been removed.`,
        type: 'success'
      });
    } catch (error) {
      setErrorMessage(error.message);
      showToast({
        title: 'Inventory delete failed',
        message: error.message,
        type: 'error'
      });
    }
  };

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Manage Inventory</h2>
        </div>
        <div className="header-actions">
          <p className="muted">Current stock only, without stock movement log, as agreed for the MVP.</p>
          <button className="primary-button" onClick={handleOpenCreate} type="button">
            Add Inventory
          </button>
        </div>
      </div>

      {errorMessage && !isModalOpen ? <p className="form-error">{errorMessage}</p> : null}

      <div className="panel">
        <div className="panel-heading">
          <h3>Inventory List</h3>
          <span className="panel-count">{items.length} total</span>
        </div>
        {isLoading ? <p>Loading inventory...</p> : null}
        {!isLoading && items.length === 0 ? <p>No inventory items yet.</p> : null}
        <div className="simple-list">
          {items.map((item) => (
            <article key={item._id} className="list-row list-row-stack">
              <div>
                <strong>{item.name}</strong>
                <p className="muted compact-text">
                  {item.quantity} {item.unit}
                </p>
              </div>
              <div className="row-actions">
                <button className="secondary-button small-button" onClick={() => handleEdit(item)} type="button">
                  Edit
                </button>
                <button className="ghost-button small-button" onClick={() => handleDelete(item._id)} type="button">
                  Delete
                </button>
              </div>
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
            <button className="primary-button" disabled={isSubmitting} form="inventory-form" type="submit">
              {isSubmitting ? 'Saving...' : editingItemId ? 'Update Item' : 'Create Item'}
            </button>
          </>
        }
        isOpen={isModalOpen}
        onClose={closeModal}
        title={formTitle}
      >
        <form className="form-grid" id="inventory-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Item Name</span>
            <input name="name" onChange={handleChange} required value={form.name} />
          </label>
          <label className="field">
            <span>Quantity</span>
            <input min="0" name="quantity" onChange={handleChange} required type="number" value={form.quantity} />
          </label>
          <label className="field">
            <span>Unit</span>
            <input name="unit" onChange={handleChange} placeholder="pcs, gram, ml" required value={form.unit} />
          </label>
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        </form>
      </FormModal>
    </section>
  );
}
