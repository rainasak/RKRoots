import * as dotenv from 'dotenv';
dotenv.config();

import { createLogger } from './common/logger';
import { initializeDatabase } from './config/database';
import { connectRedis } from './config/redis';
import app from './app';

const logger = createLogger('main');
const PORT = process.env.PORT || 3000;

Promise.all([initializeDatabase(), connectRedis()])
  .then(() => {
    logger.info('Database and Redis connected');
    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Server started');
    });
  })
  .catch((error) => {
    logger.fatal({ err: error }, 'Connection failed');
    process.exit(1);
  });

export default app;
