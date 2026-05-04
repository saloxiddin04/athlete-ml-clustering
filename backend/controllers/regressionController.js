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
// ── O'qitish ─────────────────────────────────────────────────────────────────
const trainRegression = async (req, res) => {
  try {
    console.log('📊 Regression: Barcha o\'qitilmagan va o\'qitilgan yozuvlar tanlanmoqda...');
    
    // Barcha o'qitish mumkin bo'lgan yozuvlarni olish
    const result = await query(
      `SELECT age, gender, height_cm, weight_kg, bmi, duration_minutes, intensity,
              activity_type, avg_heart_rate, resting_heart_rate, daily_steps,
              sleep_hours, stress_level, endurance_level, hydration_level,
              systolic_bp, diastolic_bp, calories_burned
       FROM participants
       WHERE calories_burned IS NOT NULL
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

    console.log(`🔧 ${data.length} ta yozuv bilan o'qitilmoqda...`);
    const trained    = trainRegressionModels(data);
    regressionModel  = trained;
    lastMetrics      = trained.metrics;

    // Mark all as trained after successful training
    await query(`UPDATE participants SET trained = true WHERE calories_burned IS NOT NULL`);

    // Recommender modelini ham qayta o'qitish
    try {
      recommenderModel = buildRecommender(data);
      console.log('✅ Recommender ham yangilandi.');
    } catch (recErr) {
      console.warn('⚠️ Recommender o\'qitishda xato:', recErr.message);
    }

    res.json({
      success: true,
      message: `Regression modellari ${trained.trainedOn} ta yozuv bilan o'qitildi. Barcha yozuvlar "trained = true" holatiga o'tkazildi.`,
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
    // Avto o'qitish (birinchi so'rovda faqat tayyor/o'qitilgan ma'lumotlarni oladi)
    if (!regressionModel) {
      const result = await query(
        `SELECT age, gender, height_cm, weight_kg, bmi, duration_minutes, activity_type, intensity,
                avg_heart_rate, resting_heart_rate, daily_steps, sleep_hours,
                stress_level, endurance_level, hydration_level,
                systolic_bp, diastolic_bp, calories_burned
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
    
    // DATA CONSISTENCY: Qiymatni formatlash
    predictedCalories = +predictedCalories.toFixed(1);

    // BASHORATNI DB GA YOZISH (Trained = false)
    try {
      await query(
        `INSERT INTO participants (
          participant_id, recorded_at, age, gender, height_cm, weight_kg, bmi, 
          activity_type, duration_minutes, intensity, calories_burned, 
          daily_steps, avg_heart_rate, resting_heart_rate, systolic_bp, 
          diastolic_bp, endurance_level, sleep_hours, stress_level, 
          hydration_level, smoke_status, health_condition, trained, source
        ) VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, false, 'prediction')`,
        [
          profile.participant_id || `ATH-${Date.now()}`,
          profile.age, profile.gender, profile.height_cm, profile.weight_kg, profile.bmi,
          profile.activity_type, profile.duration_minutes, profile.intensity, predictedCalories,
          profile.daily_steps, profile.avg_heart_rate, profile.resting_heart_rate, profile.systolic_bp,
          profile.diastolic_bp, profile.endurance_level, profile.sleep_hours, profile.stress_level,
          profile.hydration_level, profile.smoke_status || 'never', profile.health_condition
        ]
      );
      console.log('📝 Yangi bashorat DB ga saqlandi (trained=false)');
    } catch (dbErr) {
      console.error('DB save error:', dbErr.message);
    }



    // 2. O'xshash 3 sportchini topish (activity_type bir xil, case-insensitive)
    let similarAthletes = [];
    try {
      // BMI ni avtomatik hisoblash (agar frontenddan kelmagan bo'lsa)
      if (!profile.bmi && profile.weight_kg && profile.height_cm) {
        const hm = parseFloat(profile.height_cm) / 100;
        profile.bmi = +(parseFloat(profile.weight_kg) / (hm * hm)).toFixed(1);
      }

      const sampleRes = await query(
        `SELECT id, participant_id, age, gender, height_cm, weight_kg, bmi, 
                activity_type, duration_minutes, intensity, calories_burned,
                avg_heart_rate, resting_heart_rate, endurance_level,
                daily_steps, sleep_hours, stress_level, hydration_level,
                systolic_bp, diastolic_bp, health_condition
         FROM participants
         WHERE LOWER(activity_type) = LOWER($1)
           AND calories_burned IS NOT NULL
           AND trained = true
         ORDER BY RANDOM()
         LIMIT 2000`,
        [profile.activity_type || '']
      );
      
      // Similar athletes ro'yxatini olish
      similarAthletes = findSimilarAthletes(profile, sampleRes.rows, regressionModel.stats, 3);

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
                  activity_type, intensity, duration_minutes,
                  height_cm, weight_kg, resting_heart_rate, daily_steps,
                  hydration_level, systolic_bp, diastolic_bp
           FROM participants
           WHERE activity_type IS NOT NULL AND intensity IS NOT NULL AND trained = true
           ORDER BY RANDOM() LIMIT 4000`
        );
        if (recData.rows.length >= 5) {
          recommenderModel = buildRecommender(recData.rows);
        }
      }
      if (recommenderModel) {
        // k ni oshirish orqali ko'proq qo'shnilarni qamrab olamiz
        recommendation = recommend(
          { ...profile, preferred_activity: profile.activity_type },
          recommenderModel,
          25
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
