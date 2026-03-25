import { TABLE_STATUS } from '../../constants/tableStatus.js';
import { TRANSACTION_STATUS } from '../../constants/transactionStatus.js';
import { Product } from '../../models/Product.js';
import { Table } from '../../models/Table.js';
import { Transaction } from '../../models/Transaction.js';
import { ApiError } from '../../utils/ApiError.js';
import { createInvoiceNumber } from '../../utils/invoice.js';

const mergeOrderItems = (currentItems, incomingItems) => {
  const mergedMap = new Map();

  for (const item of currentItems) {
    mergedMap.set(String(item.product), {
      product: item.product,
      name: item.name,
      price: item.price,
      quantity: item.quantity
    });
  }

  for (const item of incomingItems) {
    const key = String(item.product);
    const existingItem = mergedMap.get(key);

    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      mergedMap.set(key, {
        product: item.product,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      });
    }
  }

  return [...mergedMap.values()].map((item) => ({
    ...item,
    lineTotal: item.price * item.quantity
  }));
};

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

const calculateSubtotal = (items) => items.reduce((sum, item) => sum + item.lineTotal, 0);

const getRequiredInventory = async (orderItems) => {
  const productIds = orderItems.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((product) => [product.id, product]));
  const usageMap = new Map();

  for (const orderItem of orderItems) {
    const product = productMap.get(String(orderItem.product));

    if (!product) {
      throw new ApiError(404, `Product not found during checkout: ${orderItem.product}`);
    }

    if (!product.trackInventory) {
      continue;
    }

    const key = String(product.id);
    const currentQuantity = usageMap.get(key) ?? 0;
    usageMap.set(key, currentQuantity + orderItem.quantity);
  }

  for (const [productId, requiredQuantity] of usageMap.entries()) {
    const product = productMap.get(productId);

    if (!product) {
      throw new ApiError(404, `Product not found: ${productId}`);
    }

    if ((product.inventoryQuantity ?? 0) < requiredQuantity) {
      throw new ApiError(409, `Insufficient stock for ${product.name}`);
    }
  }

  return usageMap;
};

const clearTableOrder = (table) => {
  table.status = TABLE_STATUS.AVAILABLE;
  table.activeOrder = null;
};

const ensureActiveTable = async (tableId) => {
  const table = await Table.findById(tableId);

  if (!table) {
    throw new ApiError(404, 'Table not found');
  }

  if (table.status !== TABLE_STATUS.ACTIVE || !table.activeOrder) {
    throw new ApiError(400, 'This table does not have an active bill');
  }

  return table;
};

export const listTables = async () => Table.find().sort({ number: 1 });

export const createTable = async ({ number }) => {
  if (!Number.isInteger(number) || number <= 0) {
    throw new ApiError(400, 'Table number must be a positive integer');
  }

  return Table.create({ number });
};

export const updateTable = async (tableId, payload) => {
  const table = await Table.findById(tableId);

  if (!table) {
    throw new ApiError(404, 'Table not found');
  }

  if (payload.number !== undefined) {
    if (!Number.isInteger(payload.number) || payload.number <= 0) {
      throw new ApiError(400, 'Table number must be a positive integer');
    }

    table.number = payload.number;
  }

  await table.save();

  return table;
};

export const deleteTable = async (tableId) => {
  const table = await Table.findById(tableId);

  if (!table) {
    throw new ApiError(404, 'Table not found');
  }

  if (table.status === TABLE_STATUS.ACTIVE) {
    throw new ApiError(400, 'Active tables cannot be deleted');
  }

  await table.deleteOne();
};

export const openTableBill = async (tableId, { customerName, items }, user) => {
  const table = await Table.findById(tableId);

  if (!table) {
    throw new ApiError(404, 'Table not found');
  }

  if (table.status === TABLE_STATUS.ACTIVE) {
    throw new ApiError(409, 'This table already has an active bill');
  }

  if (!customerName?.trim()) {
    throw new ApiError(400, 'Customer name is required');
  }

  const orderItems = await buildOrderItems(items);
  const subtotal = calculateSubtotal(orderItems);

  table.status = TABLE_STATUS.ACTIVE;
  table.activeOrder = {
    customerName: customerName.trim(),
    items: orderItems,
    subtotal,
    openedBy: user.id,
    openedAt: new Date(),
    updatedAt: new Date()
  };

  await table.save();

  return table;
};

export const addItemsToTableBill = async (tableId, { customerName, items }) => {
  const table = await ensureActiveTable(tableId);

  const incomingItems = await buildOrderItems(items);
  const mergedItems = mergeOrderItems(table.activeOrder.items, incomingItems);

  table.activeOrder.customerName = customerName?.trim() || table.activeOrder.customerName;
  table.activeOrder.items = mergedItems;
  table.activeOrder.subtotal = calculateSubtotal(mergedItems);
  table.activeOrder.updatedAt = new Date();

  await table.save();

  return table;
};

export const replaceTableBillItems = async (tableId, { customerName, items }) => {
  const table = await ensureActiveTable(tableId);

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Active bill must contain at least one item');
  }

  const updatedItems = await buildOrderItems(items);

  table.activeOrder.customerName = customerName?.trim() || table.activeOrder.customerName;
  table.activeOrder.items = updatedItems;
  table.activeOrder.subtotal = calculateSubtotal(updatedItems);
  table.activeOrder.updatedAt = new Date();

  await table.save();

  return table;
};

export const removeItemFromTableBill = async (tableId, productId) => {
  const table = await ensureActiveTable(tableId);
  const nextItems = table.activeOrder.items.filter((item) => String(item.product) !== String(productId));

  if (nextItems.length === table.activeOrder.items.length) {
    throw new ApiError(404, 'Product item not found in active bill');
  }

  if (nextItems.length === 0) {
    clearTableOrder(table);
  } else {
    table.activeOrder.items = nextItems;
    table.activeOrder.subtotal = calculateSubtotal(nextItems);
    table.activeOrder.updatedAt = new Date();
  }

  await table.save();

  return table;
};

export const checkoutTableBill = async (tableId, { status, paymentMethod, cancelReason }, user) => {
  const table = await ensureActiveTable(tableId);

  const checkoutStatus = status ?? TRANSACTION_STATUS.PAID;

  if (![TRANSACTION_STATUS.PAID, TRANSACTION_STATUS.CANCEL].includes(checkoutStatus)) {
    throw new ApiError(400, 'Checkout status must be paid or cancel');
  }

  if (checkoutStatus === TRANSACTION_STATUS.PAID) {
    const requiredInventory = await getRequiredInventory(table.activeOrder.items);

    for (const [productId, requiredQuantity] of requiredInventory.entries()) {
      await Product.findByIdAndUpdate(productId, {
        $inc: {
          inventoryQuantity: -requiredQuantity
        }
      });
    }
  }

  const transaction = await Transaction.create({
    invoiceNo: createInvoiceNumber(),
    table: table.id,
    tableNumber: table.number,
    cashier: user.id,
    customerName: table.activeOrder.customerName,
    status: checkoutStatus,
    paymentMethod: paymentMethod?.trim() || 'cash',
    cancelReason: checkoutStatus === TRANSACTION_STATUS.CANCEL ? cancelReason?.trim() || null : null,
    items: table.activeOrder.items,
    subtotal: table.activeOrder.subtotal,
    totalAmount: table.activeOrder.subtotal,
    finalizedAt: new Date()
  });

  clearTableOrder(table);
  await table.save();

  return transaction;
};

export const getTableDetail = async (tableId) => {
  const table = await Table.findById(tableId).populate('activeOrder.openedBy', 'fullName username role');

  if (!table) {
    throw new ApiError(404, 'Table not found');
  }

  return table;
};
