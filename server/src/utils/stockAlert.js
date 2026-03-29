export const getStockAlert = (product) => {
  if (!product?.trackInventory) {
    return null;
  }

  const quantity = Number(product.inventoryQuantity ?? 0);
  const threshold = Math.max(0, Number(product.lowStockThreshold ?? 0));
  const unit = product.inventoryUnit || 'pcs';

  if (quantity <= 0) {
    return {
      status: 'out',
      isAlert: true,
      threshold,
      message: `Out of stock: ${product.name}`,
      detail: `0 ${unit} remaining`
    };
  }

  if (threshold > 0 && quantity <= threshold) {
    return {
      status: 'low',
      isAlert: true,
      threshold,
      message: `Low stock: ${product.name}`,
      detail: `${quantity} ${unit} remaining (threshold ${threshold} ${unit})`
    };
  }

  return {
    status: 'normal',
    isAlert: false,
    threshold,
    message: null,
    detail: `${quantity} ${unit} available`
  };
};
