import { Router } from 'express';
import { activeOrdersRouter } from '../modules/active-orders/activeOrders.routes.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { inventoryRouter } from '../modules/inventory/inventory.routes.js';
import { productsRouter } from '../modules/products/products.routes.js';
import { tablesRouter } from '../modules/tables/tables.routes.js';
import { transactionsRouter } from '../modules/transactions/transactions.routes.js';
import { usersRouter } from '../modules/users/users.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/inventory', inventoryRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/active-orders', activeOrdersRouter);
apiRouter.use('/tables', tablesRouter);
apiRouter.use('/transactions', transactionsRouter);
