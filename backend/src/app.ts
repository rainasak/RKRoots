import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import passport from 'passport';
import * as dotenv from 'dotenv';

dotenv.config();

import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { requestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { errorHandlerMiddleware } from './common/middleware/error-handler.middleware';
import { initSentry, sentryRequestHandler, sentryErrorHandler } from './common/sentry';
import { configurePassport } from './config/passport';
import routes from './routes';

const app = express();

initSentry(app);
app.use(sentryRequestHandler);

app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

configurePassport();
app.use(passport.initialize());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use('/api/v1', routes);

app.use(sentryErrorHandler);
app.use(errorHandlerMiddleware);

export default app;
