import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import {
  checkoutActiveOrderTransactionController,
  checkoutDirectTransactionController,
  transactionAnalyticsController,
  listTransactionsController,
  transactionDetailController,
  transactionSummaryController
} from './transactions.controller.js';

export const transactionsRouter = Router();

transactionsRouter.use(authenticate);
transactionsRouter.post('/checkout-direct', checkoutDirectTransactionController);
transactionsRouter.post('/checkout-active-order/:activeOrderId', checkoutActiveOrderTransactionController);
transactionsRouter.get('/analytics', transactionAnalyticsController);
transactionsRouter.get('/summary', transactionSummaryController);
transactionsRouter.get('/:transactionId', transactionDetailController);
transactionsRouter.get('/', listTransactionsController);
