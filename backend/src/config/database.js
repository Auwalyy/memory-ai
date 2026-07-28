const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connect = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not defined');

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  logger.info('MongoDB connected', { uri: uri.replace(/\/\/.*@/, '//<credentials>@') });

  // Sync indexes after connection — drops stale indexes and creates new ones.
  // Required when index definitions change (e.g. language_override added).
  try {
    const Story = require('../features/stories/story.model');
    const Proverb = require('../features/proverbs/proverb.model');
    await Promise.all([
      Story.syncIndexes(),
      Proverb.syncIndexes(),
    ]);
    logger.info('MongoDB indexes synced');
  } catch (err) {
    logger.warn('Index sync failed — continuing', { err: err.message });
  }
};

const disconnect = async () => {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
};

mongoose.connection.on('error', (err) => logger.error('MongoDB error', { err }));
mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

module.exports = { connect, disconnect };
