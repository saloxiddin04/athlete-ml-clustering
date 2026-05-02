/**
 * Activity Recommendation Controller
 * POST /api/recommend  – returns best activity, intensity, duration
 */
const { query } = require('../db');
const { buildRecommender, recommend } = require('../ml/activityRecommender');

let recommenderModel = null;

const getRecommendation = async (req, res) => {
  try {
    if (!recommenderModel) {
      const result = await query(
        `SELECT age, bmi, gender, health_condition, smoke_status,
                stress_level, sleep_hours, avg_heart_rate, endurance_level,
                activity_type, intensity, duration_minutes
         FROM participants
         WHERE activity_type IS NOT NULL AND intensity IS NOT NULL
         ORDER BY RANDOM() LIMIT 4000`
      );
      if (result.rows.length < 5) {
        return res.status(400).json({ success: false, error: 'Need at least 5 labelled records. Please upload a dataset.' });
      }
      recommenderModel = buildRecommender(result.rows);
    }

    const profile = req.body;
    const result  = recommend(profile, recommenderModel, 9);

    res.json({ success: true, recommendation: result });
  } catch (err) {
    console.error('Recommend error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const refreshRecommender = async (_req, res) => {
  recommenderModel = null;
  res.json({ success: true, message: 'Recommender cache cleared.' });
};

module.exports = { getRecommendation, refreshRecommender };
