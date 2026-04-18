import { useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { FormModal } from '../../components/common/FormModal.jsx';
import { IconButton } from '../../components/common/IconButton.jsx';
import { useRoleEyebrow } from '../../hooks/useRoleEyebrow.js';
import { useToast } from '../../hooks/useToast.js';
import { apiRequest } from '../../lib/api.js';
import { formatCurrency } from '../../lib/format.js';
import { DEFAULT_PRODUCT_IMAGE } from '../../lib/productImage.js';
import styles from './Products.module.css';

const productTabs = [
  { value: 'product', label: 'Product' },
  { value: 'category', label: 'Category' }
];

const defaultForm = {
  name: '',
  price: '',
  categoryId: '',
  imageDataUrl: null,
  imageChanged: false,
  trackInventory: false,
  lowStockThreshold: ''
};

const defaultCategoryForm = {
  name: ''
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read image file'));
    reader.readAsDataURL(file);
  });

const MAX_PRODUCT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const sanitizeDecimalInput = (value) => {
  const normalized = value.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const firstDecimalSeparator = normalized.indexOf('.');

  if (firstDecimalSeparator === -1) {
    return normalized;
  }

  return `${normalized.slice(0, firstDecimalSeparator + 1)}${normalized.slice(firstDecimalSeparator + 1).replace(/\./g, '')}`;
};

const parseDecimalValue = (value) => {
  const normalized = sanitizeDecimalInput(value).trim();

  if (!normalized || normalized === '.') {
    return null;
  }

  const parsedValue = Number(normalized);

  return Number.isFinite(parsedValue) ? parsedValue : null;
};

export function ProductsPageComponent() {
  const eyebrow = useRoleEyebrow('Admin');
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('product');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [categoryForm, setCategoryForm] = useState(defaultCategoryForm);
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editingProductId, setEditingProductId] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [updatingProductId, setUpdatingProductId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const hasCategories = categories.length > 0;
  const formTitle = useMemo(() => (editingProductId ? 'Edit Product' : 'Add Product'), [editingProductId]);
  const categoryFormTitle = useMemo(
    () => (editingCategoryId ? 'Edit Category' : 'Add Category'),
    [editingCategoryId]
  );
  const productListGridTemplate = hasCategories
    ? 'repeat(6, minmax(0, 1fr))'
    : 'repeat(5, minmax(0, 1fr))';

  const loadProducts = async () => {
    const response = await apiRequest('/products?includeInactive=true');
    setProducts(response.products);
  };

  const loadCategories = async () => {
    const response = await apiRequest('/categories');
    setCategories(response.categories);
  };

  const loadPageData = async () => {
    setIsLoading(true);

    try {
      await Promise.all([loadProducts(), loadCategories()]);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, []);

  useEffect(() => {
    if (!hasCategories) {
      setCategoryFilter('');
      setForm((currentForm) => ({ ...currentForm, categoryId: '' }));
      return;
    }

    if (categoryFilter && !categories.some((category) => category._id === categoryFilter)) {
      setCategoryFilter('');
    }
  }, [categories, categoryFilter, hasCategories]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = productSearch.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch = !normalizedQuery || product.name.toLowerCase().includes(normalizedQuery);
      const matchesCategory = !categoryFilter || product.category?._id === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, productSearch, products]);

  const closeModal = () => {
    setForm(defaultForm);
    setEditingProductId(null);
    setIsModalOpen(false);
    setErrorMessage('');
  };

  const closeCategoryModal = () => {
    setCategoryForm(defaultCategoryForm);
    setEditingCategoryId(null);
    setIsCategoryModalOpen(false);
    setErrorMessage('');
  };

  const handleOpenCreate = () => {
    closeModal();
    setIsModalOpen(true);
  };

  const handleOpenCreateCategory = () => {
    closeCategoryModal();
    setIsCategoryModalOpen(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: name === 'price' ? sanitizeDecimalInput(value) : value
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

    if (file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
      setErrorMessage('Product image must be 5 MB or smaller');
      event.target.value = '';
      return;
    }

    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      setForm((currentForm) => ({
        ...currentForm,
        imageDataUrl,
        imageChanged: true
      }));
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      event.target.value = '';
    }
  };

  const handleEdit = (product) => {
    setEditingProductId(product._id);
    setForm({
      name: product.name,
      price: String(product.price),
      categoryId: product.category?._id ?? '',
      imageDataUrl: product.imageDataUrl ?? null,
      imageChanged: false,
      trackInventory: product.trackInventory ?? false,
      lowStockThreshold:
        product.trackInventory && (product.lowStockThreshold ?? 0) > 0 ? String(product.lowStockThreshold) : ''
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleCategoryChange = (event) => {
    const { value } = event.target;
    setCategoryForm({
      name: value
    });
  };

  const handleEditCategory = (category) => {
    setEditingCategoryId(category._id);
    setCategoryForm({
      name: category.name
    });
    setErrorMessage('');
    setIsCategoryModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const parsedPrice = parseDecimalValue(form.price);

      if (parsedPrice === null || parsedPrice < 0) {
        throw new Error('Product price must be a valid number');
      }

      const payload = {
        name: form.name,
        price: parsedPrice,
        categoryId: hasCategories ? form.categoryId || null : null,
        trackInventory: form.trackInventory,
        lowStockThreshold: form.trackInventory ? Number(form.lowStockThreshold) : 0
      };

      if (!editingProductId || form.imageChanged) {
        payload.imageDataUrl = form.imageDataUrl;
      }

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

  const handleSubmitCategory = async (event) => {
    event.preventDefault();
    setIsSubmittingCategory(true);
    setErrorMessage('');

    try {
      const payload = {
        name: categoryForm.name
      };

      if (editingCategoryId) {
        await apiRequest(`/categories/${editingCategoryId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        showToast({
          title: 'Category updated',
          message: `${payload.name} has been updated.`,
          type: 'success'
        });
      } else {
        await apiRequest('/categories', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        showToast({
          title: 'Category created',
          message: `${payload.name} is ready to use.`,
          type: 'success'
        });
      }

      await Promise.all([loadCategories(), loadProducts()]);
      closeCategoryModal();
    } catch (error) {
      setErrorMessage(error.message);
      showToast({
        title: editingCategoryId ? 'Category update failed' : 'Category save failed',
        message: error.message,
        type: 'error'
      });
    } finally {
      setIsSubmittingCategory(false);
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

  const handleDeleteCategory = async () => {
    if (!deletingCategory) {
      return;
    }

    setIsDeletingCategory(true);

    try {
      await apiRequest(`/categories/${deletingCategory._id}`, {
        method: 'DELETE'
      });
      await Promise.all([loadCategories(), loadProducts()]);
      showToast({
        title: 'Category deleted',
        message: `${deletingCategory.name} has been removed.`,
        type: 'success'
      });
      setDeletingCategory(null);
    } catch (error) {
      setErrorMessage(error.message);
      showToast({
        title: 'Category delete failed',
        message: error.message,
        type: 'error'
      });
    } finally {
      setIsDeletingCategory(false);
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

      {errorMessage && !isModalOpen && !isCategoryModalOpen ? <p className="form-error">{errorMessage}</p> : null}

      <div className={styles.tabBar}>
        <div className="range-switch">
          {productTabs.map((tab) => (
            <button
              key={tab.value}
              className={`range-switch-button${activeTab === tab.value ? ' range-switch-button-active' : ''}`}
              onClick={() => setActiveTab(tab.value)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'product' ? (
        <div className="user-list-section">
          <div className={styles.productTopbar}>
            <button className="primary-button section-action-button" onClick={handleOpenCreate} type="button">
              Add Product
            </button>
            <div className={styles.filterPanel}>
              <div className={styles.productToolbar}>
                <label aria-label="Search product" className={`${styles.searchControl} ${styles.searchField}`}>
                  <span className={styles.searchIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path
                        d="M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.44 4.44 1.41-1.41-4.44-4.44A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  <input
                    onChange={(event) => setProductSearch(event.target.value)}
                    placeholder="Search product"
                    type="search"
                    value={productSearch}
                  />
                </label>
                {hasCategories ? (
                  <label aria-label="Filter category" className={`${styles.categoryControl} ${styles.categoryField}`}>
                    <select onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}>
                      <option value="">All</option>
                      {categories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
            </div>
          </div>

          <div className={`panel ${styles.listPanel}`}>
            <div className={styles.listHeader}>
              <div className="panel-heading user-list-heading">
                <h3>Product List</h3>
              </div>
            </div>
            {isLoading ? <p>Loading products...</p> : null}
            {!isLoading && filteredProducts.length === 0 ? <p>No products found.</p> : null}
            <div className="report-table product-table">
              {filteredProducts.length > 0 ? (
                <article
                  className={`report-row report-row-header product-row product-row-header ${styles.productListRow}`}
                  style={{ gridTemplateColumns: productListGridTemplate }}
                >
                  <strong>Image</strong>
                  <strong>Product Name</strong>
                  {hasCategories ? <strong>Category</strong> : null}
                  <strong>Price</strong>
                  <strong>POS Active</strong>
                  <strong>Action</strong>
                </article>
              ) : null}
              {filteredProducts.map((product) => (
                <article
                  key={product._id}
                  className={`report-row product-row ${styles.productListRow}`}
                  style={{ gridTemplateColumns: productListGridTemplate }}
                >
                  <div className="product-table-image">
                    <img alt={product.name} src={product.imageDataUrl || DEFAULT_PRODUCT_IMAGE} />
                  </div>
                  <div className={`product-name-cell ${styles.productNameCell}`}>
                    <strong>{product.name}</strong>
                  </div>
                  {hasCategories ? <span className={styles.productCategoryCell}>{product.category?.name ?? '-'}</span> : null}
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
      ) : (
        <div className={styles.categorySection}>
          <button className="primary-button section-action-button" onClick={handleOpenCreateCategory} type="button">
            Add Category
          </button>

          <div className={`panel ${styles.listPanel} ${styles.categoryListPanel}`}>
            <div className="panel-heading user-list-heading">
              <h3>Category List</h3>
            </div>
            {isLoading ? <p>Loading categories...</p> : null}
            {!isLoading && categories.length === 0 ? <p>No categories yet.</p> : null}
            <div className="report-table product-table">
              {categories.length > 0 ? (
                <article
                  className={`report-row report-row-header ${styles.categoryListRow} ${styles.categoryRow} ${styles.categoryRowHeader}`}
                  style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
                >
                  <strong>Category Name</strong>
                  <strong>Action</strong>
                </article>
              ) : null}
              {categories.map((category) => (
                <article
                  key={category._id}
                  className={`report-row ${styles.categoryListRow} ${styles.categoryRow}`}
                  style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
                >
                  <strong className={styles.categoryNameCell}>{category.name}</strong>
                  <div className={styles.categoryActionCell}>
                    <div className={styles.categoryActionGroup}>
                      <IconButton
                        icon="edit"
                        label="Edit category"
                        onClick={() => handleEditCategory(category)}
                      />
                      <IconButton
                        icon="delete"
                        label="Delete category"
                        onClick={() => setDeletingCategory(category)}
                        variant="danger"
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

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
            <input
              inputMode="decimal"
              name="price"
              onChange={handleChange}
              placeholder="10.50"
              required
              type="text"
              value={form.price}
            />
          </label>
          {hasCategories ? (
            <label className="field">
              <span>Category</span>
              <select name="categoryId" onChange={handleChange} value={form.categoryId}>
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
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
                  onClick={() =>
                    setForm((currentForm) => ({ ...currentForm, imageDataUrl: null, imageChanged: true }))
                  }
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

      <FormModal
        footer={
          <>
            <button className="secondary-button" onClick={closeCategoryModal} type="button">
              Cancel
            </button>
            <button className="primary-button" disabled={isSubmittingCategory} form="category-form" type="submit">
              {isSubmittingCategory ? 'Saving...' : editingCategoryId ? 'Update Category' : 'Create Category'}
            </button>
          </>
        }
        isOpen={isCategoryModalOpen}
        onClose={closeCategoryModal}
        title={categoryFormTitle}
      >
        <form className="form-grid" id="category-form" onSubmit={handleSubmitCategory}>
          <label className="field">
            <span>Category Name</span>
            <input onChange={handleCategoryChange} required type="text" value={categoryForm.name} />
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
      <ConfirmDialog
        confirmLabel="Yes"
        isConfirming={isDeletingCategory}
        isOpen={Boolean(deletingCategory)}
        message={`Delete ${deletingCategory?.name ?? 'this category'}? Products using this category will become uncategorized.`}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDeleteCategory}
        title="Delete Category"
      />
    </section>
  );
}
