import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  createTable,
  deleteTable,
  getTableActiveOrder,
  getTableDetail,
  listTables,
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
