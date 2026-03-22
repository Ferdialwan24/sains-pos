import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { app } from './app.js';

const startServer = async () => {
  await connectDatabase();

  app.listen(env.port, () => {
    console.log(`API server listening on port ${env.port}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start the server', error);
  process.exit(1);
});

