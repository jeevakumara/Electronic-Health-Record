require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const apiRoutes = require('./routes');
const { testConnection, pool } = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend integration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// HTTP request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

const path = require('path');

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static client integration assets
app.use(express.static(path.join(__dirname, '../public')));

// Liveness & health check endpoint
app.get('/api/v1/health', async (req, res) => {
  const connStatus = await testConnection();
  res.status(200).json({
    success: true,
    message: 'Temporal EHR Backend Server is operational',
    data: {
      status: 'UP',
      database: connStatus.success ? 'CONNECTED' : 'DISCONNECTED',
      database_error: connStatus.success ? null : connStatus.error,
      uptime_seconds: process.uptime()
    },
    timestamp: new Date().toISOString()
  });
});

// Mount modular API v1 routes
app.use('/api/v1', apiRoutes);

// 404 handler for undefined endpoints
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`
    },
    timestamp: new Date().toISOString()
  });
});

// Centralized error handling middleware
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  Temporal EHR Platform Backend Server Running     `);
  console.log(`  Port: ${PORT}                                    `);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Health Check: http://localhost:${PORT}/api/v1/health`);
  console.log(`====================================================`);
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\nGracefully shutting down server...');
  server.close(async () => {
    try {
      await pool.end();
      console.log('Database pool connections closed.');
    } catch (err) {
      console.error('Error closing database pool:', err.message);
    }
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM. Shutting down server...');
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
});

module.exports = app;
