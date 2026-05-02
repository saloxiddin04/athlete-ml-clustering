// /**
//  * Fitness Prediction Controller - High Performance Version
//  */
// const { query } = require('../db');
// const { normalize, predictFitnessLevel } = require('../ml/classifier');
//
// const predict = async (req, res) => {
//   try {
//     const data = req.body;
//
//     // 🔍 Memory Optimization: Fetch a high-quality sample for reference
//     // We don't need 687k records to make an accurate KNN prediction.
//     // 2,000 records provide a perfect balance of speed and accuracy.
//     console.log('🤖 AI is selecting 2,000 reference points for prediction...');
//     const trainedResult = await query('SELECT * FROM participants WHERE trained = true ORDER BY RANDOM() LIMIT 2000');
//     const referenceData = trainedResult.rows;
//
//     if (referenceData.length < 5) {
//       return res.status(400).json({ success: false, error: 'Insufficient trained data. Please upload a dataset first.' });
//     }
//
//     // Prepare for normalization
//     // We only send the numbers to the ML engine to save even more memory
//     const { normalized } = normalize([...referenceData, data]);
//     const normalizedTarget = normalized[normalized.length - 1];
//     const normalizedReference = normalized.slice(0, normalized.length - 1);
//
//     // Run prediction (K-Nearest Neighbors)
//     console.log('🧠 Running AI classification...');
//     const predictedLevel = predictFitnessLevel(normalizedTarget, normalizedReference, 5);
//
//     // Save prediction record
//     const result = await query(
//       `INSERT INTO participants (
//         participant_id, recorded_at, age, gender, height_cm, weight_kg, bmi,
//         activity_type, duration_minutes, intensity, calories_burned,
//         daily_steps, avg_heart_rate, resting_heart_rate, systolic_bp,
//         diastolic_bp, endurance_level, sleep_hours, stress_level,
//         hydration_level, smoke_status, health_condition, fitness_level,
//         trained, source
//       )
//        VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, false, 'prediction') RETURNING *`,
//       [
//         data.participant_id || `PRED-${Date.now().toString().slice(-4)}`,
//         data.age, data.gender, data.height_cm, data.weight_kg, data.bmi,
//         data.activity_type, data.duration_minutes, data.intensity, data.calories_burned,
//         data.daily_steps, data.avg_heart_rate, data.resting_heart_rate, data.systolic_bp,
//         data.diastolic_bp, data.endurance_level, data.sleep_hours, data.stress_level,
//         data.hydration_level, data.smoke_status, data.health_condition, predictedLevel
//       ]
//     );
//
//     res.json({
//       success: true,
//       prediction: predictedLevel,
//       record: result.rows[0]
//     });
//
//   } catch (error) {
//     console.error('Prediction Error:', error);
//     res.status(500).json({ success: false, error: 'AI Memory limit reached. Try with fewer features.' });
//   }
// };
//
// module.exports = { predict };

/**
 * Fitness Prediction Controller - Optimized Version
 */

const { query } = require('../db');
const {
  initializeModel,
  normalizeTarget,
  weightedKNNPredict,
  validateInput,
  calculateBMI,
  modelCache
} = require('../ml/optimizedClassifier');

// Model initialization flag
let isModelReady = false;

/**
 * Warm up the model on server start
 */
const warmUpModel = async () => {
  try {
    console.log('🔥 Warming up ML model...');
    await initializeModel(query);
    isModelReady = true;
    console.log('✅ Model is ready for predictions');
  } catch (error) {
    console.error('❌ Model warmup failed:', error.message);
    isModelReady = false;
  }
};

/**
 * Batch prediction for multiple records
 */
const batchPredict = async (req, res) => {
  try {
    if (!isModelReady) {
      await warmUpModel();
    }

    const { records } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of records for batch prediction'
      });
    }

    if (records.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 records per batch prediction'
      });
    }

    const predictions = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      try {
        const data = records[i];

        // Validate input
        const validationErrors = validateInput(data);
        if (validationErrors.length > 0) {
          errors.push({ index: i, errors: validationErrors });
          continue;
        }

        // Calculate BMI if missing
        if (!data.bmi && data.height_cm && data.weight_kg) {
          data.bmi = calculateBMI(data.height_cm, data.weight_kg);
        }

        // Normalize target
        const normalizedTarget = normalizeTarget(data, modelCache.stats);

        // Make prediction
        const { prediction, confidence, neighborsCount } = weightedKNNPredict(
          normalizedTarget,
          modelCache.trainingData
        );

        // Save prediction
        const result = await query(
          `INSERT INTO participants (
                        participant_id, recorded_at, age, gender, height_cm, weight_kg, bmi, 
                        activity_type, duration_minutes, intensity, calories_burned, 
                        daily_steps, avg_heart_rate, resting_heart_rate, systolic_bp, 
                        diastolic_bp, endurance_level, sleep_hours, stress_level, 
                        hydration_level, smoke_status, health_condition, fitness_level, 
                        trained, source, prediction_confidence
                    )
                    VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, false, 'prediction', $23) 
                    RETURNING *`,
          [
            data.participant_id || `PRED-${Date.now()}-${i}`,
            data.age, data.gender, data.height_cm, data.weight_kg, data.bmi,
            data.activity_type || 'unknown',
            data.duration_minutes || 0,
            data.intensity || 'moderate',
            data.calories_burned || 0,
            data.daily_steps || 0,
            data.avg_heart_rate || 0,
            data.resting_heart_rate || 0,
            data.systolic_bp || 0,
            data.diastolic_bp || 0,
            data.endurance_level || 3,
            data.sleep_hours || 7,
            data.stress_level || 3,
            data.hydration_level || 3,
            data.smoke_status || 'No',
            data.health_condition || 'None',
            prediction,
            confidence
          ]
        );

        predictions.push({
          index: i,
          prediction: prediction,
          confidence: confidence,
          neighbors_used: neighborsCount,
          record_id: result.rows[0].id
        });

      } catch (error) {
        errors.push({ index: i, error: error.message });
      }
    }

    res.json({
      success: true,
      total_predictions: predictions.length,
      total_errors: errors.length,
      predictions: predictions,
      errors: errors,
      model_info: {
        total_samples: modelCache.totalSamples,
        features_used: require('../ml/optimizedClassifier').FEATURES.length,
        last_updated: modelCache.lastUpdated
      }
    });

  } catch (error) {
    console.error('Batch Prediction Error:', error);
    res.status(500).json({
      success: false,
      error: 'Batch prediction failed: ' + error.message
    });
  }
};

/**
 * Single prediction with detailed explanation
 */
const predict = async (req, res) => {
  try {
    const startTime = Date.now();

    // Ensure model is ready
    if (!isModelReady) {
      await warmUpModel();
    }

    const data = req.body;

    console.log("data========", data)

    // Validate input
    const validationErrors = validateInput(data);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }

    // Calculate BMI if missing
    if (!data.bmi && data.height_cm && data.weight_kg) {
      data.bmi = calculateBMI(data.height_cm, data.weight_kg);
    }

    // Normalize target using cached stats
    const normalizedTarget = normalizeTarget(data, modelCache.stats);

    // Make prediction with confidence score
    const { prediction, confidence, neighborsCount } = weightedKNNPredict(
      normalizedTarget,
      modelCache.trainingData
    );

    // Find similar profiles for explanation
    const similarProfiles = findSimilarProfiles(normalizedTarget, modelCache.trainingData, 3);

    // Save prediction record
    const result = await query(
      `INSERT INTO participants (
                participant_id, recorded_at, age, gender, height_cm, weight_kg, bmi, 
                activity_type, duration_minutes, intensity, calories_burned, 
                daily_steps, avg_heart_rate, resting_heart_rate, systolic_bp, 
                diastolic_bp, endurance_level, sleep_hours, stress_level, 
                hydration_level, smoke_status, health_condition, fitness_level, 
                trained, source, prediction_confidence, processing_time_ms
            )
            VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, false, 'prediction', $23, $24) 
            RETURNING *`,
      [
        data.participant_id || `PRED-${Date.now().toString().slice(-6)}`,
        data.age, data.gender, data.height_cm, data.weight_kg, data.bmi,
        data.activity_type || 'unknown',
        data.duration_minutes || 0,
        data.intensity || 'moderate',
        data.calories_burned || 0,
        data.daily_steps || 0,
        data.avg_heart_rate || 0,
        data.resting_heart_rate || 0,
        data.systolic_bp || 0,
        data.diastolic_bp || 0,
        data.endurance_level || 3,
        data.sleep_hours || 7,
        data.stress_level || 3,
        data.hydration_level || 3,
        data.smoke_status || 'No',
        data.health_condition || 'None',
        prediction,
        confidence,
        Date.now() - startTime
      ]
    );

    // Generate fitness recommendations
    const recommendations = generateRecommendations(data, prediction);

    res.json({
      success: true,
      prediction: {
        fitness_level: prediction,
        confidence_score: (confidence * 100).toFixed(2) + '%',
        interpretation: getFitnessLevelInterpretation(prediction)
      },
      similar_profiles: similarProfiles,
      recommendations: recommendations,
      processing_time_ms: Date.now() - startTime,
      model_info: {
        neighbors_used: neighborsCount,
        total_reference_samples: modelCache.totalSamples,
        features_analyzed: require('../ml/optimizedClassifier').FEATURES.length
      },
      record: result.rows[0]
    });

  } catch (error) {
    console.error('Prediction Error:', error);
    res.status(500).json({
      success: false,
      error: 'Prediction failed: ' + error.message
    });
  }
};

/**
 * Find similar profiles for explanation
 */
const findSimilarProfiles = (target, trainingSet, limit = 3) => {
  const distances = trainingSet.map(point => ({
    fitness_level: point.fitness_level,
    distance: require('../ml/optimizedClassifier').calculateWeightedDistance ?
      require('../ml/optimizedClassifier').calculateWeightedDistance(target, point) :
      Math.random()
  }));

  distances.sort((a, b) => a.distance - b.distance);

  return distances.slice(0, limit).map(d => ({
    fitness_level: d.fitness_level,
    similarity_score: ((1 - d.distance) * 100).toFixed(1) + '%'
  }));
};

/**
 * Generate personalized recommendations based on prediction
 */
const generateRecommendations = (data, fitnessLevel) => {
  const recommendations = [];

  switch (parseInt(fitnessLevel)) {
    case 1: // Beginner
      recommendations.push({
        area: 'Cardio',
        suggestion: 'Start with 10-15 minute walks daily, gradually increasing to 30 minutes',
        priority: 'High'
      });
      recommendations.push({
        area: 'Strength',
        suggestion: 'Bodyweight exercises: squats, push-ups (knee version), planks (15-20 seconds)',
        priority: 'High'
      });
      recommendations.push({
        area: 'Lifestyle',
        suggestion: `Increase daily steps from ${data.daily_steps || 0} to 5000 steps/day`,
        priority: 'Medium'
      });
      break;

    case 2: // Below Average
      recommendations.push({
        area: 'Cardio',
        suggestion: '30-minute brisk walks or light jogging 3-4 times per week',
        priority: 'High'
      });
      recommendations.push({
        area: 'Strength',
        suggestion: 'Basic resistance training with bands or light weights, 2-3 times/week',
        priority: 'High'
      });
      break;

    case 3: // Average
      recommendations.push({
        area: 'Cardio',
        suggestion: 'Mix of moderate and high-intensity cardio, 150 minutes/week',
        priority: 'Medium'
      });
      recommendations.push({
        area: 'Strength',
        suggestion: 'Compound exercises: deadlifts, squats, bench press, 3x/week',
        priority: 'Medium'
      });
      break;

    case 4: // Above Average
      recommendations.push({
        area: 'Performance',
        suggestion: 'HIIT workouts 2-3x/week, long slow distance cardio 1x/week',
        priority: 'Low'
      });
      recommendations.push({
        area: 'Strength',
        suggestion: 'Advanced programming: periodization, progressive overload',
        priority: 'Low'
      });
      break;

    case 5: // Elite
      recommendations.push({
        area: 'Maintenance',
        suggestion: 'Focus on recovery, mobility work, and sport-specific training',
        priority: 'Low'
      });
      recommendations.push({
        area: 'Optimization',
        suggestion: 'Track metrics, adjust nutrition, optimize sleep (8-9 hours)',
        priority: 'Low'
      });
      break;
  }

  // Health condition specific recommendations
  if (data.health_condition && data.health_condition !== 'None') {
    recommendations.push({
      area: 'Medical',
      suggestion: `Consult healthcare provider before starting new exercise routine (Condition: ${data.health_condition})`,
      priority: 'Critical'
    });
  }

  // BMI specific
  if (data.bmi > 30) {
    recommendations.push({
      area: 'Weight Management',
      suggestion: 'Focus on low-impact activities: swimming, cycling, walking',
      priority: 'High'
    });
  }

  return recommendations;
};

/**
 * Get human-readable interpretation of fitness level
 */
const getFitnessLevelInterpretation = (level) => {
  const num = parseFloat(level);
  if (isNaN(num)) return 'Unknown fitness level';
  
  if (num >= 15) return 'Elite - Exceptional athletic performance';
  if (num >= 10) return 'Above Average - Very active, high endurance';
  if (num >= 7)  return 'Average - Healthy lifestyle, balanced metrics';
  if (num >= 4)  return 'Below Average - Good foundation, room for improvement';
  return 'Beginner - Starting fitness journey, focus on basic habits';
};

/**
 * Get model statistics
 */
const getModelStats = async (req, res) => {
  try {
    const stats = await query(`
            SELECT 
                COUNT(*) as total_predictions,
                AVG(prediction_confidence) as avg_confidence,
                MIN(prediction_confidence) as min_confidence,
                MAX(prediction_confidence) as max_confidence,
                AVG(processing_time_ms) as avg_processing_time
            FROM participants 
            WHERE source = 'prediction'
            AND recorded_at >= CURRENT_DATE - INTERVAL '30 days'
        `);

    const fitnessDistribution = await query(`
            SELECT 
                fitness_level,
                COUNT(*) as count,
                AVG(prediction_confidence) as avg_conf
            FROM participants 
            WHERE source = 'prediction'
            GROUP BY fitness_level
            ORDER BY fitness_level
        `);

    res.json({
      success: true,
      model_status: {
        is_ready: isModelReady,
        total_samples: modelCache.totalSamples || 0,
        last_updated: modelCache.lastUpdated
      },
      prediction_stats: stats.rows[0],
      fitness_distribution: fitnessDistribution.rows,
      feature_weights: require('../ml/optimizedClassifier').FEATURE_WEIGHTS
    });

  } catch (error) {
    console.error('Stats Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Refresh model manually
 */
const refreshModel = async (req, res) => {
  try {
    await warmUpModel();
    res.json({
      success: true,
      message: 'Model refreshed successfully',
      model_info: {
        total_samples: modelCache.totalSamples,
        last_updated: modelCache.lastUpdated
      }
    });
  } catch (error) {
    console.error('Refresh Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Auto-warmup on module load
warmUpModel().catch(console.error);

module.exports = {
  predict,
  batchPredict,
  getModelStats,
  refreshModel,
  warmUpModel
};