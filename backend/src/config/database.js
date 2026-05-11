const mongoose = require('mongoose');
const logger = require('../utils/logger');

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/claims_processor';

  mongoose.connection.on('connected', () => logger.info('✅ MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error('MongoDB error:', err));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });
}

module.exports = { connectDB };
