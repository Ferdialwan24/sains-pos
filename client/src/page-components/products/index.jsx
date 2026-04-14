import { useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { FormModal } from '../../components/common/FormModal.jsx';
import { IconButton } from '../../components/common/IconButton.jsx';
import { useRoleEyebrow } from '../../hooks/useRoleEyebrow.js';
import { useToast } from '../../hooks/useToast.js';
import { apiRequest } from '../../lib/api.js';
import { formatCurrency } from '../../lib/format.js';
import styles from './Products.module.css';

const defaultForm = {
  name: '',
  price: '',
  imageDataUrl: null,
  trackInventory: false,
  lowStockThreshold: ''
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read image file'));
    reader.readAsDataURL(file);
  });

export function ProductsPageComponent() {
  const eyebrow = useRoleEyebrow('Admin');
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [editingProductId, setEditingProductId] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingProductId, setUpdatingProductId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const formTitle = useMemo(() => (editingProductId ? 'Edit Product' : 'Add Product'), [editingProductId]);

  const loadProducts = async () => {
    setIsLoading(true);

    try {
      const response = await apiRequest('/products?includeInactive=true');
      setProducts(response.products);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const closeModal = () => {
    setForm(defaultForm);
    setEditingProductId(null);
    setIsModalOpen(false);
    setErrorMessage('');
  };

  const handleOpenCreate = () => {
    closeModal();
    setIsModalOpen(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  };

  const handleToggleInventory = () => {
    setForm((currentForm) => ({
      ...currentForm,
      trackInventory: !currentForm.trackInventory
    }));
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      setForm((currentForm) => ({
        ...currentForm,
        imageDataUrl
      }));
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleEdit = (product) => {
    setEditingProductId(product._id);
    setForm({
      name: product.name,
      price: String(product.price),
      imageDataUrl: product.imageDataUrl ?? null,
      trackInventory: product.trackInventory ?? false,
      lowStockThreshold:
        product.trackInventory && (product.lowStockThreshold ?? 0) > 0 ? String(product.lowStockThreshold) : ''
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
        price: Number(form.price),
        imageDataUrl: form.imageDataUrl,
        trackInventory: form.trackInventory,
        lowStockThreshold: form.trackInventory ? Number(form.lowStockThreshold) : 0
      };

      if (editingProductId) {
        await apiRequest(`/products/${editingProductId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        showToast({
          title: 'Product updated',
          message: `${payload.name} has been updated.`,
          type: 'success'
        });
      } else {
        await apiRequest('/products', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        showToast({
          title: 'Product created',
          message: `${payload.name} is now available in POS.`,
          type: 'success'
        });
      }

      closeModal();
      await loadProducts();
    } catch (error) {
      setErrorMessage(error.message);
      showToast({
        title: 'Product save failed',
        message: error.message,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) {
      return;
    }

    setIsDeleting(true);

    try {
      await apiRequest(`/products/${deletingProduct._id}`, {
        method: 'DELETE'
      });
      await loadProducts();
      showToast({
        title: 'Product deleted',
        message: `${deletingProduct.name} has been removed.`,
        type: 'success'
      });
      setDeletingProduct(null);
    } catch (error) {
      setErrorMessage(error.message);
      showToast({
        title: 'Product delete failed',
        message: error.message,
        type: 'error'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleProductActive = async (product) => {
    setUpdatingProductId(product._id);
    setErrorMessage('');

    try {
      await apiRequest(`/products/${product._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          isActive: !product.isActive
        })
      });
      await loadProducts();
      showToast({
        title: product.isActive ? 'Product hidden from POS' : 'Product visible in POS',
        message: `${product.name} ${product.isActive ? 'will no longer appear' : 'is now available'} in POS.`,
        type: 'success'
      });
    } catch (error) {
      setErrorMessage(error.message);
      showToast({
        title: 'Product status update failed',
        message: error.message,
        type: 'error'
      });
    } finally {
      setUpdatingProductId(null);
    }
  };

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>Manage Products</h2>
        </div>
      </div>

      {errorMessage && !isModalOpen ? <p className="form-error">{errorMessage}</p> : null}

      <div className="user-list-section">
        <button className="primary-button section-action-button" onClick={handleOpenCreate} type="button">
          Add Product
        </button>

        <div className={`panel ${styles.listPanel}`}>
          <div className="panel-heading user-list-heading">
            <h3>Product List</h3>
          </div>
          {isLoading ? <p>Loading products...</p> : null}
          {!isLoading && products.length === 0 ? <p>No products yet.</p> : null}
          <div className="report-table product-table">
            {products.length > 0 ? (
              <article className="report-row report-row-header product-row product-row-header">
                <strong>Image</strong>
                <strong>Product Name</strong>
                <strong>Price</strong>
                <strong>POS Active</strong>
                <strong>Action</strong>
              </article>
            ) : null}
            {products.map((product) => (
              <article key={product._id} className="report-row product-row">
                <div className="product-table-image">
                  {product.imageDataUrl ? <img alt={product.name} src={product.imageDataUrl} /> : <span>No image</span>}
                </div>
                <div className="product-name-cell">
                  <strong>{product.name}</strong>
                </div>
                <span>{formatCurrency(product.price)}</span>
                <div className={styles.visibilityCell}>
                  <button
                    aria-label={product.isActive ? 'Hide product from POS' : 'Show product in POS'}
                    aria-pressed={product.isActive}
                    className={`toggle-switch${product.isActive ? ' toggle-switch-active' : ''}`}
                    disabled={updatingProductId === product._id}
                    onClick={() => handleToggleProductActive(product)}
                    type="button"
                  >
                    <span />
                  </button>
                  <span className={`pill ${product.isActive ? 'pill-success' : 'pill-available'}`}>
                    {product.isActive ? 'Active' : 'Hidden'}
                  </span>
                </div>
                <div className={`row-actions ${styles.rowActions}`}>
                  <IconButton icon="edit" label="Edit product" onClick={() => handleEdit(product)} />
                  <IconButton
                    icon="delete"
                    label="Delete product"
                    onClick={() => setDeletingProduct(product)}
                    variant="danger"
                  />
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <FormModal
        footer={
          <>
            <button className="secondary-button" onClick={closeModal} type="button">
              Cancel
            </button>
            <button className="primary-button" disabled={isSubmitting} form="product-form" type="submit">
              {isSubmitting ? 'Saving...' : editingProductId ? 'Update Product' : 'Create Product'}
            </button>
          </>
        }
        isOpen={isModalOpen}
        onClose={closeModal}
        title={formTitle}
      >
        <form className="form-grid" id="product-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Product Name</span>
            <input name="name" onChange={handleChange} required value={form.name} />
          </label>
          <label className="field">
            <span>Price</span>
            <input min="0" name="price" onChange={handleChange} required type="number" value={form.price} />
          </label>
          <div className="field">
            <span>Product Image</span>
            <label className="upload-field">
              <input accept="image/*" onChange={handleImageChange} type="file" />
              <span>Upload image</span>
            </label>
            {form.imageDataUrl ? (
              <div className="upload-preview">
                <img alt="Product preview" src={form.imageDataUrl} />
                <button
                  className="secondary-button small-button"
                  onClick={() => setForm((currentForm) => ({ ...currentForm, imageDataUrl: null }))}
                  type="button"
                >
                  Remove image
                </button>
              </div>
            ) : null}
          </div>
          <label className="toggle-field">
            <span>Track inventory</span>
            <button
              aria-pressed={form.trackInventory}
              className={`toggle-switch${form.trackInventory ? ' toggle-switch-active' : ''}`}
              onClick={handleToggleInventory}
              type="button"
            >
              <span />
            </button>
          </label>
          {form.trackInventory ? (
            <label className="field">
              <span>Low Stock Alert Threshold</span>
              <input
                min="1"
                name="lowStockThreshold"
                onChange={handleChange}
                placeholder="10"
                required
                type="number"
                value={form.lowStockThreshold}
              />
            </label>
          ) : null}
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        </form>
      </FormModal>

      <ConfirmDialog
        confirmLabel="Yes"
        isConfirming={isDeleting}
        isOpen={Boolean(deletingProduct)}
        message={`Delete ${deletingProduct?.name ?? 'this product'}?`}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDelete}
        title="Delete Product"
      />
    </section>
  );
}
