const mongoose = require('mongoose');

/**
 * Establish a connection to MongoDB using the URI provided in the environment
 * variables. On success a connection message will be logged to stdout. On
 * failure the process will exit with a non‑zero exit code.
 */
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;