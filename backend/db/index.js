/**
 * Database connection pool
 * Supports PostgreSQL via pg library
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'athlete_clustering',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const query = async (text, params) => {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
};

const initDB = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS uploads (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        row_count INTEGER DEFAULT 0,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Enhanced Participants Table with DATE support for analytics
    await query(`
      CREATE TABLE IF NOT EXISTS participants (
        id SERIAL PRIMARY KEY,
        participant_id VARCHAR(50),
        recorded_at DATE, -- Added for time-series charts
        age DECIMAL(6,2),
        gender VARCHAR(50),
        height_cm DECIMAL(8,2),
        weight_kg DECIMAL(8,2),
        bmi DECIMAL(8,2),
        activity_type VARCHAR(100),
        duration_minutes DECIMAL(10,2),
        intensity VARCHAR(50),
        calories_burned DECIMAL(12,2),
        daily_steps DECIMAL(12,2),
        avg_heart_rate DECIMAL(8,2),
        resting_heart_rate DECIMAL(8,2),
        systolic_bp DECIMAL(8,2),
        diastolic_bp DECIMAL(8,2),
        endurance_level DECIMAL(8,2),
        sleep_hours DECIMAL(8,2),
        stress_level DECIMAL(8,2),
        hydration_level DECIMAL(8,2),
        smoke_status VARCHAR(100),
        health_condition VARCHAR(255),
        fitness_level VARCHAR(100), -- Classification Target
        trained BOOLEAN DEFAULT FALSE,
        pca_x DECIMAL(10,5), -- AI coordinate X
        pca_y DECIMAL(10,5), -- AI coordinate Y
        cluster_id INTEGER, -- K-Means cluster
        source VARCHAR(50) DEFAULT 'from_csv',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS model_meta (
        id SERIAL PRIMARY KEY,
        accuracy DECIMAL(8,6),
        total_records INTEGER,
        trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'sportsman' CHECK (role IN ('admin', 'manager', 'sportsman')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`CREATE INDEX IF NOT EXISTS idx_participants_date ON participants(recorded_at)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_participants_flevel ON participants(fitness_level)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_participants_gender ON participants(gender)`);

    console.log('✅ Database schema updated for Advanced Analytics');
  } catch (error) {
    console.error('❌ DB init error:', error.message);
    throw error;
  }
};

module.exports = { query, pool, initDB };
