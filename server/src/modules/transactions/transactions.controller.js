import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import {
  checkoutActiveOrderTransaction,
  checkoutDirectTransaction,
  getTransactionAnalytics,
  getTransactionDetail,
  getTransactionSummary,
  listTransactions
} from './transactions.service.js';

export const checkoutDirectTransactionController = asyncHandler(async (request, response) => {
  const transaction = await checkoutDirectTransaction(request.body, request.user);

  response.status(201).json({
    transaction
  });
});

export const checkoutActiveOrderTransactionController = asyncHandler(async (request, response) => {
  const transaction = await checkoutActiveOrderTransaction(request.params.activeOrderId, request.body, request.user);

  response.status(201).json({
    transaction
  });
});

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

export const transactionAnalyticsController = asyncHandler(async (request, response) => {
  const analytics = await getTransactionAnalytics(request.query);

  response.json({
    analytics
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
