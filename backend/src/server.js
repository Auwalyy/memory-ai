require('dotenv').config();
const app = require('./app');
const { connect, disconnect } = require('./config/database');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connect();
    const server = app.listen(PORT, () => {
      logger.info(`MemoryAI Nigeria API running`, {
        port: PORT,
        env: process.env.NODE_ENV,
        url: `http://localhost:${PORT}`,
      });
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await disconnect();
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (err) => {
      logger.error('Unhandled rejection', { err: err.message, stack: err.stack });
      shutdown('unhandledRejection');
    });
  } catch (err) {
    logger.error('Failed to start server', { err: err.message });
    process.exit(1);
  }
};

start();
