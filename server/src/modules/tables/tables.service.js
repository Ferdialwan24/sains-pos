import { TABLE_STATUS } from '../../constants/tableStatus.js';
import { Table } from '../../models/Table.js';
import { ApiError } from '../../utils/ApiError.js';

const tableActiveOrderPopulate = {
  path: 'activeOrderId',
  populate: [
    {
      path: 'createdBy',
      select: 'fullName username role'
    },
    {
      path: 'table',
      select: 'number status activeOrderId'
    }
  ]
};

export const listTables = async () =>
  Table.find()
    .populate(tableActiveOrderPopulate)
    .sort({ number: 1 });

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

export const getTableDetail = async (tableId) => {
  const table = await Table.findById(tableId).populate(tableActiveOrderPopulate);

  if (!table) {
    throw new ApiError(404, 'Table not found');
  }

  return table;
};

export const getTableActiveOrder = async (tableId) => {
  const table = await Table.findById(tableId).populate(tableActiveOrderPopulate);

  if (!table) {
    throw new ApiError(404, 'Table not found');
  }

  if (table.activeOrderId) {
    return table.activeOrderId;
  }

  throw new ApiError(404, 'This table does not have an active bill');
};
