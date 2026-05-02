/**
 * Athlete Clustering API Server
 * Express.js backend with ML clustering algorithms
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// ===== Middleware =====
app.use(cors({
  origin: "*",
  credentials: true
}));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ===== Routes =====
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large (max 10MB)' });
  }
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ===== Start Server =====
const startServer = async () => {
  try {
    // Initialize database tables
    await initDB();

    app.listen(PORT, () => {
      console.log(`\n🚀 Athlete Clustering API running on port ${PORT}`);
      console.log(`   API: http://localhost:${PORT}/api`);
      console.log(`   Health: http://localhost:${PORT}/api/health\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
