import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  addItemsToTableBill,
  checkoutTableBill,
  createTable,
  deleteTable,
  getTableActiveOrder,
  getTableDetail,
  listTables,
  openTableBill,
  removeItemFromTableBill,
  replaceTableBillItems,
  updateTable
} from './tables.service.js';

export const listTablesController = asyncHandler(async (_request, response) => {
  const tables = await listTables();

  response.json({
    tables
  });
});

export const getTableDetailController = asyncHandler(async (request, response) => {
  const table = await getTableDetail(request.params.tableId);

  response.json({
    table
  });
});

export const getTableActiveOrderController = asyncHandler(async (request, response) => {
  const activeOrder = await getTableActiveOrder(request.params.tableId);

  response.json({
    activeOrder
  });
});

export const createTableController = asyncHandler(async (request, response) => {
  const table = await createTable(request.body);

  response.status(201).json({
    table
  });
});

export const updateTableController = asyncHandler(async (request, response) => {
  const table = await updateTable(request.params.tableId, request.body);

  response.json({
    table
  });
});

export const deleteTableController = asyncHandler(async (request, response) => {
  await deleteTable(request.params.tableId);

  response.status(204).send();
});

export const openTableBillController = asyncHandler(async (request, response) => {
  const table = await openTableBill(request.params.tableId, request.body, request.user);

  response.json({
    table
  });
});

export const addItemsToTableBillController = asyncHandler(async (request, response) => {
  const table = await addItemsToTableBill(request.params.tableId, request.body);

  response.json({
    table
  });
});

export const replaceTableBillItemsController = asyncHandler(async (request, response) => {
  const table = await replaceTableBillItems(request.params.tableId, request.body);

  response.json({
    table
  });
});

export const removeItemFromTableBillController = asyncHandler(async (request, response) => {
  const table = await removeItemFromTableBill(request.params.tableId, request.params.productId);

  response.json({
    table
  });
});

export const checkoutTableBillController = asyncHandler(async (request, response) => {
  const transaction = await checkoutTableBill(request.params.tableId, request.body, request.user);

  response.json({
    transaction
  });
});
