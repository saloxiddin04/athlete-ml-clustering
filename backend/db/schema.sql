-- =====================================================
-- Athlete Clustering Database Schema
-- =====================================================

-- Athletes table: stores athlete data + cluster assignments
CREATE TABLE IF NOT EXISTS athletes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  height DECIMAL(5,2) NOT NULL,        -- in cm
  weight DECIMAL(5,2) NOT NULL,        -- in kg
  muscle_mass DECIMAL(5,2) NOT NULL,   -- in %
  run_time DECIMAL(6,3) NOT NULL,      -- in seconds (100m)
  cluster_kmeans INTEGER DEFAULT NULL,
  cluster_hierarchical INTEGER DEFAULT NULL,
  trained BOOLEAN DEFAULT FALSE,
  upload_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Uploads table: tracks CSV file uploads
CREATE TABLE IF NOT EXISTS uploads (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  row_count INTEGER DEFAULT 0,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Training results table: stores algorithm comparison metrics
CREATE TABLE IF NOT EXISTS training_results (
  id SERIAL PRIMARY KEY,
  kmeans_score DECIMAL(6,4),
  hierarchical_score DECIMAL(6,4),
  k_value INTEGER,
  kmeans_inertia DECIMAL(10,4),
  athlete_count INTEGER,
  trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key
ALTER TABLE athletes ADD CONSTRAINT fk_upload
  FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_athletes_trained ON athletes(trained);
CREATE INDEX IF NOT EXISTS idx_athletes_upload_id ON athletes(upload_id);
