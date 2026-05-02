/**
 * Health Risk + Fitness Score + Anomaly Detection Controller
 */
const { query } = require('../db');
const { trainHealthRisk, predictHealthRisk } = require('../ml/healthRisk');
const { computeFitnessScore, buildGlobalStats, buildIsolationForest, detectAnomalies } = require('../ml/fitnessScore');

let riskModel      = null;
let globalStats    = null;
let anomalyForest  = null;

// ── Health Risk Prediction ────────────────────────────────────────────────────
const trainRisk = async (_req, res) => {
  try {
    const result = await query(
      `SELECT age, bmi, systolic_bp, diastolic_bp, smoke_status,
              stress_level, sleep_hours, resting_heart_rate, avg_heart_rate,
              health_condition
       FROM participants ORDER BY RANDOM() LIMIT 5000`
    );
    if (result.rows.length < 20) {
      return res.status(400).json({ success: false, error: 'Not enough data.' });
    }
    riskModel = trainHealthRisk(result.rows);
    res.json({ success: true, metrics: riskModel.metrics, trainedOn: riskModel.trainedOn, highRiskCount: riskModel.highRiskCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const predictRisk = async (req, res) => {
  try {
    if (!riskModel) {
      const r = await query(`SELECT age, bmi, systolic_bp, diastolic_bp, smoke_status,
                                    stress_level, sleep_hours, resting_heart_rate, avg_heart_rate,
                                    health_condition
                             FROM participants ORDER BY RANDOM() LIMIT 3000`);
      if (r.rows.length < 20) return res.status(400).json({ success: false, error: 'Upload data first.' });
      riskModel = trainHealthRisk(r.rows);
    }
    
    const { model = 'dt', ...profile } = req.body;
    const result = predictHealthRisk(profile, riskModel, model);
    
    // Dynamic Anomaly Detection
    if (!anomalyForest) {
      const rForest = await query(`SELECT id, participant_id, avg_heart_rate, resting_heart_rate,
                sleep_hours, stress_level, bmi, calories_burned, daily_steps,
                age, gender, activity_type, health_condition
         FROM participants ORDER BY RANDOM() LIMIT 500`);
      if (rForest.rows.length >= 10) {
        anomalyForest = buildIsolationForest(rForest.rows, 50, 256);
      }
    }
    
    let is_anomaly = false;
    let anomaly_score = 0;
    if (anomalyForest) {
       anomaly_score = require('../ml/fitnessScore').anomalyScore(anomalyForest, profile);
       is_anomaly = anomaly_score > 0.60;
    }

    res.json({ 
      success: true, 
      result, 
      is_anomaly, 
      anomaly_score, 
      risk_level: result.risk 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getRiskMetrics = (_req, res) => {
  if (!riskModel) return res.json({ success: true, metrics: null });
  res.json({ success: true, metrics: riskModel.metrics, trainedOn: riskModel.trainedOn, highRiskCount: riskModel.highRiskCount });
};

// ── Fitness Score ─────────────────────────────────────────────────────────────
const getFitnessScores = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || 200);
    const result = await query(
      `SELECT id, participant_id, age, gender, bmi, calories_burned,
              endurance_level, avg_heart_rate, sleep_hours, stress_level,
              daily_steps, smoke_status, fitness_level, activity_type
       FROM participants
       WHERE calories_burned IS NOT NULL
       ORDER BY RANDOM() LIMIT $1`, [limit]
    );
    const data = result.rows;
    if (data.length < 2) return res.status(400).json({ success: false, error: 'Not enough data.' });

    if (!globalStats) globalStats = buildGlobalStats(data);
    const scored = data.map(row => ({
      ...row,
      fitness_score: computeFitnessScore(row, globalStats)
    }));

    const avg = Math.round(scored.reduce((s, r) => s + r.fitness_score, 0) / scored.length);
    const distribution = { elite: 0, advanced: 0, intermediate: 0, beginner: 0 };
    scored.forEach(r => {
      if (r.fitness_score >= 80) distribution.elite++;
      else if (r.fitness_score >= 60) distribution.advanced++;
      else if (r.fitness_score >= 40) distribution.intermediate++;
      else distribution.beginner++;
    });

    res.json({ success: true, scores: scored, avgScore: avg, distribution });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── Anomaly Detection ─────────────────────────────────────────────────────────
const getAnomalies = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || 500);
    const result = await query(
      `SELECT id, participant_id, avg_heart_rate, resting_heart_rate,
              sleep_hours, stress_level, bmi, calories_burned, daily_steps,
              age, gender, activity_type, health_condition
       FROM participants ORDER BY RANDOM() LIMIT $1`, [limit]
    );
    const data = result.rows;
    if (data.length < 10) return res.status(400).json({ success: false, error: 'Not enough data for anomaly detection.' });

    if (!anomalyForest) {
      console.log('🌲 Building Isolation Forest...');
      anomalyForest = buildIsolationForest(data, 50, 256);
    }

    const threshold = parseFloat(req.query.threshold || 0.60);
    const anomalies = detectAnomalies(anomalyForest, data, threshold);
    const flagged   = anomalies.filter(a => a.isAnomaly);

    res.json({
      success: true,
      total: data.length,
      anomalyCount: flagged.length,
      anomalyRate: +((flagged.length / data.length) * 100).toFixed(1),
      anomalies: flagged.slice(0, 50),
      allScores: anomalies.map(a => ({ id: a.id, score: a.score, isAnomaly: a.isAnomaly }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { trainRisk, predictRisk, getRiskMetrics, getFitnessScores, getAnomalies };
