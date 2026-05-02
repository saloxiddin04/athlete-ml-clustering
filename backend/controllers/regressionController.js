/**
 * Regression + Smart Recommendation Controller (Birlashtirилган)
 *
 * POST /api/regression/train   – Regression modellarini o'qitish
 * POST /api/regression/predict – Kaloriya bashoratlash + o'xshash 3 sportchi + faoliyat tavsiyasi
 * GET  /api/regression/metrics – Oxirgi o'qitish metrikalarini olish
 *
 * Yangi g'oya:
 *  1. Target: calories_burned ni bashorat qilish (Min-Max [0,1] normalizatsiya bilan)
 *  2. KNN orqali o'xshash 3 ta sportchini topish (activity_type bir xil bo'lishi shart)
 *  3. Smart Recommendation: faoliyat turi, intensivlik, davomiylik tavsiyasi
 */

const { query }                = require('../db');
const {
  trainRegressionModels,
  predictCalories,
  findSimilarAthletes,
  REG_FEATURES
}                              = require('../ml/regression');
const { buildRecommender, recommend } = require('../ml/activityRecommender');

// In-memory model store (server restart bo'lsa reset bo'ladi)
let regressionModel  = null;
let lastMetrics      = null;
let recommenderModel = null;

// ── O'qitish ─────────────────────────────────────────────────────────────────
const trainRegression = async (req, res) => {
  try {
    console.log('📊 Regression: 10.000 ta yozuv tanlanmoqda...');
    const result = await query(
      `SELECT age, height_cm, weight_kg, bmi, duration_minutes, intensity,
              activity_type, avg_heart_rate, resting_heart_rate, daily_steps,
              sleep_hours, stress_level, endurance_level, hydration_level,
              calories_burned
       FROM participants
       WHERE calories_burned IS NOT NULL
         AND trained = true
       ORDER BY RANDOM()
       LIMIT 10000`
    );

    const data = result.rows;
    if (data.length < 30) {
      return res.status(400).json({
        success: false,
        error: 'Regression uchun yetarli ma\'lumot yo\'q (30+ kerak). Avval CSV yuklang.'
      });
    }

    console.log(`🔧 ${data.length} ta yozuv bilan o'qitilmoqda (Min-Max normalizatsiya)...`);
    const trained    = trainRegressionModels(data);
    regressionModel  = trained;
    lastMetrics      = trained.metrics;

    // Recommender modelini ham qayta o'qitish
    try {
      recommenderModel = buildRecommender(data);
      console.log('✅ Recommender ham yangilandi.');
    } catch (recErr) {
      console.warn('⚠️ Recommender o\'qitishda xato:', recErr.message);
    }

    res.json({
      success: true,
      message: `Regression modellari ${trained.trainedOn} ta yozuv bilan o'qitildi (Min-Max [0,1] normalizatsiya).`,
      metrics: trained.metrics
    });
  } catch (err) {
    console.error('Regression train error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── Bashoratlash: Kaloriya + o'xshash sportchilar + tavsiya ─────────────────
/**
 * Asosiy predict endpoint.
 * Qaytaradi:
 *  - predicted_calories: bashorat qilingan kaloriya
 *  - model_used: qaysi model ishlatildi
 *  - similar_athletes: bir xil activity_type bilan o'xshash 3 sportchi
 *  - recommendation: faoliyat tavsiyasi
 *  - metrics: o'qitish metrikalari
 */
const predictReg = async (req, res) => {
  try {
    // Avto o'qitish (birinchi so'rovda)
    if (!regressionModel) {
      const result = await query(
        `SELECT age, height_cm, weight_kg, bmi, duration_minutes, activity_type,
                avg_heart_rate, resting_heart_rate, daily_steps, sleep_hours,
                stress_level, endurance_level, hydration_level,
                calories_burned
         FROM participants
         WHERE calories_burned IS NOT NULL AND trained = true
         ORDER BY RANDOM() LIMIT 3000`
      );
      if (result.rows.length < 30) {
        return res.status(400).json({
          success: false,
          error: 'Avval regression modelini o\'qiting (CSV yuklang va "Train" bosing).'
        });
      }
      regressionModel = trainRegressionModels(result.rows);
      lastMetrics     = regressionModel.metrics;
      try { recommenderModel = buildRecommender(result.rows); } catch (_) {}
    }

    const { model: preferModel = 'rf', ...profile } = req.body;

    // 1. Kaloriya bashoratlash
    let predictedCalories = predictCalories(profile, regressionModel, preferModel);
    
    // DATA REALISM: Agar bashorat juda kichik bo'lsa (dataset birligi kichik bo'lishi mumkin),
    // uni 20 ga ko'paytiramiz (32.3 -> 646.0) foydalanuvchi so'raganidek.
    const SCALE_FACTOR = 20;
    predictedCalories = +(predictedCalories * SCALE_FACTOR).toFixed(1);

    // 2. O'xshash 3 sportchini topish (activity_type bir xil, case-insensitive)
    let similarAthletes = [];
    try {
      const sampleRes = await query(
        `SELECT id, participant_id, age, gender, height_cm, weight_kg, bmi, 
                activity_type, duration_minutes, intensity, calories_burned,
                avg_heart_rate, resting_heart_rate, endurance_level
         FROM participants
         WHERE LOWER(activity_type) = LOWER($1)
           AND calories_burned IS NOT NULL
           AND trained = true
         ORDER BY RANDOM()
         LIMIT 2000`,
        [profile.activity_type || '']
      );
      
      // Similar athletes ro'yxatini olishda ham kaloriyani scale qilamiz
      similarAthletes = findSimilarAthletes(profile, sampleRes.rows, regressionModel.stats, 3);
      similarAthletes = similarAthletes.map(ath => ({
        ...ath,
        calories_burned: +(parseFloat(ath.calories_burned || 0) * 20).toFixed(1)
      }));
    } catch (knnErr) {
      console.warn('KNN similar athletes xato:', knnErr.message);
    }

    // 3. Smart Recommendation (faoliyat tavsiyasi)
    //    Foydalanuvchi tanlagan activity_type ni hisobga olib k ni oshiramiz
    //    va recommendation shu aktivitega yo'naltiriladi
    let recommendation = null;
    try {
      if (!recommenderModel) {
        const recData = await query(
          `SELECT age, bmi, gender, health_condition, smoke_status,
                  stress_level, sleep_hours, avg_heart_rate, endurance_level,
                  activity_type, intensity, duration_minutes
           FROM participants
           WHERE activity_type IS NOT NULL AND intensity IS NOT NULL AND trained = true
           ORDER BY RANDOM() LIMIT 4000`
        );
        if (recData.rows.length >= 5) {
          recommenderModel = buildRecommender(recData.rows);
        }
      }
      if (recommenderModel) {
        // Foydalanuvchi tanlagan activity_type ga mos qo'shnilarni ko'proq olish uchun
        // k ni oshirib, tanlangan faoliyatni "preferred" sifatida uzatamiz
        recommendation = recommend(
          { ...profile, preferred_activity: profile.activity_type },
          recommenderModel,
          15
        );
      }
    } catch (recErr) {
      console.warn('Recommendation xato:', recErr.message);
    }

    res.json({
      success: true,
      predicted_calories: predictedCalories,
      model_used: preferModel,
      similar_athletes: similarAthletes,
      recommendation,
      metrics: lastMetrics
    });
  } catch (err) {
    console.error('Regression predict error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── Metrikalari ───────────────────────────────────────────────────────────────
const getMetrics = async (_req, res) => {
  if (!lastMetrics) {
    return res.json({ success: true, metrics: null, message: 'Model hali o\'qitilmagan.' });
  }
  res.json({ success: true, metrics: lastMetrics });
};

module.exports = { trainRegression, predictReg, getMetrics };
