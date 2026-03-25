import { useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { FormModal } from '../../components/common/FormModal.jsx';
import { IconButton } from '../../components/common/IconButton.jsx';
import { useToast } from '../../hooks/useToast.js';
import { apiRequest } from '../../lib/api.js';
import { formatCurrency } from '../../lib/format.js';

const defaultForm = {
  name: '',
  price: '',
  imageDataUrl: null,
  trackInventory: false
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read image file'));
    reader.readAsDataURL(file);
  });

export function ProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [editingProductId, setEditingProductId] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      trackInventory: product.trackInventory ?? false
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
        trackInventory: form.trackInventory
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

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Manage Products</h2>
        </div>
        <p className="muted">Products now focus on name, price, image, and optional stock tracking.</p>
      </div>

      {errorMessage && !isModalOpen ? <p className="form-error">{errorMessage}</p> : null}

      <div className="panel">
        <div className="panel-heading">
          <div className="panel-heading-left">
            <button className="primary-button" onClick={handleOpenCreate} type="button">
              Add Product
            </button>
            <h3>Product List</h3>
          </div>
          <span className="panel-count">{products.length} total</span>
        </div>
        {isLoading ? <p>Loading products...</p> : null}
        {!isLoading && products.length === 0 ? <p>No products yet.</p> : null}
        <div className="product-list-grid">
          {products.map((product) => (
            <article key={product._id} className="product-list-card">
              <div className="product-list-image">
                {product.imageDataUrl ? <img alt={product.name} src={product.imageDataUrl} /> : <span>No image</span>}
              </div>
              <div className="product-list-copy">
                <strong>{product.name}</strong>
                <span>{formatCurrency(product.price)}</span>
                {product.trackInventory ? (
                  <span className={`pill ${product.inventoryQuantity > 0 ? 'pill-active' : 'pill-available'}`}>
                    Stock {product.inventoryQuantity} {product.inventoryUnit}
                  </span>
                ) : (
                  <span className="pill pill-available">Inventory off</span>
                )}
              </div>
              <div className="row-actions">
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

