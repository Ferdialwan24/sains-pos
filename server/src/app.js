import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';

export const app = express();

app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(
  express.json({
    limit: '10mb'
  })
);
app.use(morgan('dev'));

app.get('/health', (_request, response) => {
  response.json({
    status: 'ok'
  });
});

app.use('/api', apiRouter);
app.use(notFound);
app.use(errorHandler);
