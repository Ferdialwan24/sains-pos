import { Router } from 'express';
import { loginController, meController } from './auth.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';

export const authRouter = Router();

authRouter.post('/login', loginController);
authRouter.get('/me', authenticate, meController);

