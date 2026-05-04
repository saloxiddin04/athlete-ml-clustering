-- Athlete Fitness Analytics Database Schema
-- Database: athlete_clustering

CREATE TABLE IF NOT EXISTS participants (
    id SERIAL PRIMARY KEY,
    participant_id VARCHAR(50),
    age NUMERIC(12,2),
    gender VARCHAR(50),
    height_cm NUMERIC(12,2),
    weight_kg NUMERIC(12,2),
    bmi NUMERIC(12,2),
    activity_type VARCHAR(100),
    duration_minutes NUMERIC(12,2),
    intensity VARCHAR(50),
    calories_burned NUMERIC(12,2),
    daily_steps NUMERIC(12,2),
    avg_heart_rate NUMERIC(12,2),
    resting_heart_rate NUMERIC(12,2),
    systolic_bp NUMERIC(12,2),
    diastolic_bp NUMERIC(12,2),
    endurance_level NUMERIC(12,2),
    sleep_hours NUMERIC(12,2),
    stress_level NUMERIC(12,2),
    hydration_level NUMERIC(12,2),
    smoke_status VARCHAR(100),
    health_condition VARCHAR(255),
    fitness_level VARCHAR(100),
    trained BOOLEAN DEFAULT FALSE,
    source VARCHAR(50) DEFAULT 'from_csv', -- 'from_csv', 'prediction', 'manual'
    pca_x NUMERIC(10,5),
    pca_y NUMERIC(10,5),
    cluster_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_at DATE
);

CREATE TABLE IF NOT EXISTS uploads (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255),
    original_name VARCHAR(255),
    row_count INTEGER,
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255),
    password VARCHAR(255),
    role VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS training_history (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100),
    rmse NUMERIC(10,4),
    r2_score NUMERIC(10,4),
    records_count INTEGER,
    trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_participants_trained ON participants(trained);
CREATE INDEX IF NOT EXISTS idx_participants_cluster ON participants(cluster_id);
CREATE INDEX IF NOT EXISTS idx_participants_p_id ON participants(participant_id);
