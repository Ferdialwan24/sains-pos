import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import {
  listTransactionsController,
  transactionDetailController,
  transactionSummaryController
} from './transactions.controller.js';

export const transactionsRouter = Router();

transactionsRouter.use(authenticate);
transactionsRouter.get('/summary', transactionSummaryController);
transactionsRouter.get('/:transactionId', transactionDetailController);
transactionsRouter.get('/', listTransactionsController);
