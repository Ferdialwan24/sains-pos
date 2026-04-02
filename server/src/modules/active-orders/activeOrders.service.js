import { ACTIVE_ORDER_STATUS } from '../../constants/activeOrderStatus.js';
import { ORDER_TYPE } from '../../constants/orderType.js';
import { TABLE_STATUS } from '../../constants/tableStatus.js';
import { ActiveOrder } from '../../models/ActiveOrder.js';
import { Product } from '../../models/Product.js';
import { Table } from '../../models/Table.js';
import { ApiError } from '../../utils/ApiError.js';

const calculateSubtotal = (items) => items.reduce((sum, item) => sum + item.lineTotal, 0);

const buildOrderItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'At least one product item is required');
  }

  const productIds = items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds }, isActive: true });
  const productMap = new Map(products.map((product) => [product.id, product]));

  return items.map((item) => {
    const product = productMap.get(item.productId);

    if (!product) {
      throw new ApiError(404, `Product not found: ${item.productId}`);
    }

    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new ApiError(400, 'Product quantity must be greater than zero');
    }

    return {
      product: product.id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      lineTotal: product.price * item.quantity
    };
  });
};

const ensureActiveOrder = async (activeOrderId) => {
  const activeOrder = await ActiveOrder.findById(activeOrderId)
    .populate('createdBy', 'fullName username role')
    .populate('table', 'number status activeOrderId');

  if (!activeOrder) {
    throw new ApiError(404, 'Active order not found');
  }

  return activeOrder;
};

const ensureAvailableTable = async (tableId, ignoredActiveOrderId = null) => {
  const table = await Table.findById(tableId);

  if (!table) {
    throw new ApiError(404, 'Table not found');
  }

  if (
    table.activeOrderId &&
    String(table.activeOrderId) !== String(ignoredActiveOrderId) &&
    table.status === TABLE_STATUS.ACTIVE
  ) {
    throw new ApiError(409, `Table ${table.number} already has an active bill`);
  }

  return table;
};

const syncTableWithActiveOrder = async (table, activeOrder) => {
  table.status = TABLE_STATUS.ACTIVE;
  table.activeOrderId = activeOrder._id;
  table.activeOrder = {
    customerName: activeOrder.customerName,
    items: activeOrder.items,
    subtotal: activeOrder.subtotal,
    openedBy: activeOrder.createdBy,
    openedAt: activeOrder.createdAt,
    updatedAt: activeOrder.updatedAt
  };

  await table.save();
};

const clearTableActiveOrder = async (tableId) => {
  if (!tableId) {
    return;
  }

  const table = await Table.findById(tableId);

  if (!table) {
    return;
  }

  table.status = TABLE_STATUS.AVAILABLE;
  table.activeOrderId = null;
  table.activeOrder = null;
  await table.save();
};

export const createActiveOrder = async ({ orderType, customerName, tableId, items }, user) => {
  if ((orderType ?? ORDER_TYPE.DINE_IN) !== ORDER_TYPE.DINE_IN) {
    throw new ApiError(400, 'Only dine-in orders can be saved as active bills');
  }

  if (!customerName?.trim()) {
    throw new ApiError(400, 'Customer name is required');
  }

  if (!tableId) {
    throw new ApiError(400, 'Table is required for dine-in active bills');
  }

  const table = await ensureAvailableTable(tableId);
  const orderItems = await buildOrderItems(items);
  const subtotal = calculateSubtotal(orderItems);

  const activeOrder = await ActiveOrder.create({
    orderType: ORDER_TYPE.DINE_IN,
    status: ACTIVE_ORDER_STATUS.ACTIVE,
    customerName: customerName.trim(),
    table: table.id,
    tableNumber: table.number,
    items: orderItems,
    subtotal,
    createdBy: user.id
  });

  await syncTableWithActiveOrder(table, activeOrder);

  return ensureActiveOrder(activeOrder.id);
};

export const getActiveOrderDetail = async (activeOrderId) => ensureActiveOrder(activeOrderId);

export const updateActiveOrder = async (activeOrderId, { customerName, tableId, items }) => {
  const activeOrder = await ensureActiveOrder(activeOrderId);
  const currentTableId = activeOrder.table?._id ?? activeOrder.table ?? null;
  const nextTableId = tableId ?? currentTableId;

  if (!nextTableId) {
    throw new ApiError(400, 'Table is required for dine-in active bills');
  }

  if (customerName !== undefined) {
    if (!customerName.trim()) {
      throw new ApiError(400, 'Customer name is required');
    }

    activeOrder.customerName = customerName.trim();
  }

  if (Array.isArray(items)) {
    const orderItems = await buildOrderItems(items);
    activeOrder.items = orderItems;
    activeOrder.subtotal = calculateSubtotal(orderItems);
  }

  if (String(nextTableId) !== String(currentTableId)) {
    const nextTable = await ensureAvailableTable(nextTableId, activeOrder.id);
    await clearTableActiveOrder(currentTableId);
    activeOrder.table = nextTable.id;
    activeOrder.tableNumber = nextTable.number;
    await activeOrder.save();
    await syncTableWithActiveOrder(nextTable, activeOrder);

    return ensureActiveOrder(activeOrder.id);
  }

  await activeOrder.save();

  const table = await ensureAvailableTable(nextTableId, activeOrder.id);
  await syncTableWithActiveOrder(table, activeOrder);

  return ensureActiveOrder(activeOrder.id);
};

export const deleteActiveOrder = async (activeOrderId) => {
  const activeOrder = await ensureActiveOrder(activeOrderId);
  const tableId = activeOrder.table?._id ?? activeOrder.table ?? null;

  await ActiveOrder.findByIdAndDelete(activeOrderId);
  await clearTableActiveOrder(tableId);
};
