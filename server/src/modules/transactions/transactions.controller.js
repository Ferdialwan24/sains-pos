import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { getTransactionDetail, getTransactionSummary, listTransactions } from './transactions.service.js';

export const listTransactionsController = asyncHandler(async (request, response) => {
  const transactions = await listTransactions(request.query);

  response.json({
    transactions
  });
});

export const transactionSummaryController = asyncHandler(async (_request, response) => {
  const summary = await getTransactionSummary(_request.query);

  response.json({
    summary
  });
});

export const transactionDetailController = asyncHandler(async (request, response) => {
  const transaction = await getTransactionDetail(request.params.transactionId);

  if (!transaction) {
    throw new ApiError(404, 'Transaction not found');
  }

  response.json({
    transaction
  });
});
