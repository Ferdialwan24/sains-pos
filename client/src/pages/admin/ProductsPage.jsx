import { useEffect, useMemo, useState } from 'react';
import { FormModal } from '../../components/common/FormModal.jsx';
import { apiRequest } from '../../lib/api.js';
import { formatCurrency } from '../../lib/format.js';
import { useToast } from '../../hooks/useToast.js';

const defaultForm = {
  name: '',
  category: '',
  price: ''
};

export function ProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [recipeQuantities, setRecipeQuantities] = useState({});
  const [editingProductId, setEditingProductId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const formTitle = useMemo(() => (editingProductId ? 'Edit Product' : 'Add Product'), [editingProductId]);

  const loadProducts = async () => {
    setIsLoading(true);

    try {
      const [productsResponse, inventoryResponse] = await Promise.all([
        apiRequest('/products?includeInactive=true'),
        apiRequest('/inventory')
      ]);

      setProducts(productsResponse.products);
      setInventoryItems(inventoryResponse.items);
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
    setRecipeQuantities({});
    setEditingProductId(null);
    setIsModalOpen(false);
    setErrorMessage('');
  };

  const handleOpenCreate = () => {
    setForm(defaultForm);
    setRecipeQuantities({});
    setEditingProductId(null);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleChange = (event) => {
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.value
    }));
  };

  const handleRecipeQuantityChange = (inventoryItemId, value) => {
    setRecipeQuantities((currentState) => ({
      ...currentState,
      [inventoryItemId]: value
    }));
  };

  const buildRecipePayload = () =>
    inventoryItems
      .map((item) => ({
        inventoryItem: item._id,
        quantity: Number(recipeQuantities[item._id] ?? 0)
      }))
      .filter((item) => item.quantity > 0);

  const handleEdit = (product) => {
    setEditingProductId(product._id);
    setForm({
      name: product.name,
      category: product.category,
      price: String(product.price)
    });

    const nextRecipeQuantities = {};
    for (const recipeItem of product.recipe ?? []) {
      nextRecipeQuantities[recipeItem.inventoryItem._id ?? recipeItem.inventoryItem] = String(recipeItem.quantity);
    }
    setRecipeQuantities(nextRecipeQuantities);
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
        category: form.category || 'General',
        price: Number(form.price),
        recipe: buildRecipePayload()
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

  const handleDelete = async (productId) => {
    const confirmed = window.confirm('Delete this product?');

    if (!confirmed) {
      return;
    }

    try {
      const deletedProduct = products.find((product) => product._id === productId);
      await apiRequest(`/products/${productId}`, {
        method: 'DELETE'
      });

      await loadProducts();
      showToast({
        title: 'Product deleted',
        message: `${deletedProduct?.name ?? 'The product'} has been removed.`,
        type: 'success'
      });
    } catch (error) {
      setErrorMessage(error.message);
      showToast({
        title: 'Product delete failed',
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
          <h2>Manage Products</h2>
        </div>
        <div className="header-actions">
          <p className="muted">Products can now carry recipe data so paid transactions can deduct inventory automatically.</p>
          <button className="primary-button" onClick={handleOpenCreate} type="button">
            Add Product
          </button>
        </div>
      </div>

      {errorMessage && !isModalOpen ? <p className="form-error">{errorMessage}</p> : null}

      <div className="panel">
        <div className="panel-heading">
          <h3>Product List</h3>
          <span className="panel-count">{products.length} total</span>
        </div>
        {isLoading ? <p>Loading products...</p> : null}
        {!isLoading && products.length === 0 ? <p>No products yet.</p> : null}
        <div className="simple-list">
          {products.map((product) => (
            <article key={product._id} className="list-row list-row-stack">
              <div>
                <strong>{product.name}</strong>
                <p className="muted compact-text">{product.category}</p>
                <p className="muted compact-text">
                  Recipe:{' '}
                  {product.recipe?.length
                    ? product.recipe
                        .map((item) => `${item.inventoryItem?.name ?? 'Unknown'} x${item.quantity}`)
                        .join(', ')
                    : 'No recipe'}
                </p>
              </div>
              <div className="row-actions">
                <span>{formatCurrency(product.price)}</span>
                <button className="secondary-button small-button" onClick={() => handleEdit(product)} type="button">
                  Edit
                </button>
                <button className="ghost-button small-button" onClick={() => handleDelete(product._id)} type="button">
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
            <span>Name</span>
            <input name="name" onChange={handleChange} required value={form.name} />
          </label>
          <label className="field">
            <span>Category</span>
            <input name="category" onChange={handleChange} placeholder="Coffee, Food, Tea" value={form.category} />
          </label>
          <label className="field">
            <span>Price</span>
            <input min="0" name="price" onChange={handleChange} required type="number" value={form.price} />
          </label>
          <div className="field">
            <span>Recipe</span>
            {inventoryItems.length === 0 ? <p className="muted compact-text">Create inventory items first if this product uses raw materials.</p> : null}
            <div className="simple-list">
              {inventoryItems.map((item) => (
                <label key={item._id} className="recipe-row">
                  <span>
                    {item.name} ({item.unit})
                  </span>
                  <input
                    min="0"
                    onChange={(event) => handleRecipeQuantityChange(item._id, event.target.value)}
                    step="any"
                    type="number"
                    value={recipeQuantities[item._id] ?? ''}
                  />
                </label>
              ))}
            </div>
          </div>
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        </form>
      </FormModal>
    </section>
  );
}
