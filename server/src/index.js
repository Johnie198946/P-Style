import express from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import { initDatabase } from './database/connection.js';
import analyzeRoutes from './routes/analyzeRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  await initDatabase();

  const app = express();
  app.use(
    cors({
      origin: '*',
      credentials: false
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'PhotoStyle Clone backend is running',
      timestamp: new Date().toISOString()
    });
  });

  app.use('/api/analyze', analyzeRoutes);
  app.use('/api/export', exportRoutes);
  app.use('/api/photos', uploadRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  app.listen(ENV.PORT, ENV.HOST, () => {
    logger.info(`Server running on http://${ENV.HOST}:${ENV.PORT}`);
    logger.info(`Environment: ${ENV.NODE_ENV}`);
  });
}

bootstrap().catch((error) => {
  logger.error('服务启动失败', error);
  process.exit(1);
});

