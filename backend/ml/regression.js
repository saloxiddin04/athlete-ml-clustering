/**
 * Calories Burned Regression Engine
 * Target:  calories_burned  (yagona maqsad)
 * Models:  Linear Regression (Gradient Descent)
 *          Random Forest (Bootstrap bagging)
 *          Gradient Boosting (XGBoost-uslubi)
 *
 * Normalizatsiya:  Har bir ustun uchun alohida Min-Max scaling [0, 1]
 *                  x_norm = (x - min) / (max - min)
 */

const REG_FEATURES = [
  'age', 'height_cm', 'weight_kg', 'duration_minutes',
  'avg_heart_rate', 'daily_steps', 'sleep_hours', 'stress_level',
  'endurance_level', 'hydration_level', 'resting_heart_rate',
  'systolic_bp', 'diastolic_bp', 'bmi'
];

const TARGET = 'calories_burned';

// Categorical Maps
const ACTIVITY_MAP = {
  'walking': 1, 'running': 2, 'cycling': 3, 'swimming': 4,
  'yoga': 5, 'hiit': 6, 'tennis': 7, 'weight training': 8,
  'basketball': 9, 'dancing': 10, 'other': 0
};
const INTENSITY_MAP = { 'low': 1, 'medium': 2, 'high': 3 };
const GENDER_MAP = { 'male': 0, 'female': 1, 'other': 0.5 };


// ── Helpers ──────────────────────────────────────────────────────────────────
// Bo'sh massiv bo'lsa 0 qaytaradi (NaN oldini olish)
const mean = arr => arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

/**
 * Har bir ustun uchun Min-Max [0,1] scaling stats hisoblash.
 * @param {Array} data - ma'lumotlar massivi
 * @param {Array} columns - normalizatsiya qilinadigan ustun nomlari
 * @returns {Object} stats - { column: { min, max } }
 */
const computeMinMaxStats = (data, columns) => {
  const stats = {};
  columns.forEach(col => {
    // Math.min/max(...largeArray) stack overflow berishi mumkin,
    // shuning uchun manual reduce ishlatiladi
    let mn = Infinity, mx = -Infinity;
    data.forEach(d => {
      const v = parseFloat(d[col] ?? 0);
      if (!isNaN(v)) { if (v < mn) mn = v; if (v > mx) mx = v; }
    });
    stats[col] = {
      min: mn === Infinity ? 0 : mn,
      max: mx === -Infinity ? 0 : mx
    };
  });
  return stats;
};

/**
 * Bitta qiymatni Min-Max [0,1] ga normalizatsiya qilish.
 */
const minMaxScale = (val, min, max) =>
  max === min ? 0 : (val - min) / (max - min);

/**
 * Bitta satrni feature vektorga aylantirish (normalizatsiya bilan).
 * @param {Object} row
 * @param {Object} stats - computeMinMaxStats natijasi
 * @returns {Array} normalizatsiya qilingan feature vektori
 */
const encodeRow = (row, stats) => {
  const features = [];

  // Numerical features
  REG_FEATURES.forEach(f => {
    features.push(minMaxScale(parseFloat(row[f] ?? 0), stats[f].min, stats[f].max));
  });

  // Categorical features (normalized to [0, 1])
  const actVal = ACTIVITY_MAP[String(row.activity_type || '').toLowerCase().trim()] || 0;
  features.push(actVal / 8); // 8 is max activity index

  const intVal = INTENSITY_MAP[String(row.intensity || '').toLowerCase().trim()] || 2;
  features.push(intVal / 3);

  const genVal = GENDER_MAP[String(row.gender || '').toLowerCase().trim()] || 0;
  features.push(genVal);

  // Metabolic Index (custom feature)
  if (stats.metabolic_index) {
    const intensityVal = INTENSITY_MAP[String(row.intensity || '').toLowerCase().trim()] || 2;
    const metIndex = (parseFloat(row.duration_minutes) || 0) * intensityVal * (parseFloat(row.avg_heart_rate) || 100) / 100;
    features.push(minMaxScale(metIndex, stats.metabolic_index.min, stats.metabolic_index.max));
  }

  return features;
};


/**
 * Target qiymatni normalizatsiya qilish.
 */
const scaleTarget = (val, stats) => {
  const targetVal = typeof val === 'object' ? parseFloat(val[TARGET] ?? 0) : parseFloat(val ?? 0);
  return minMaxScale(targetVal, stats[TARGET].min, stats[TARGET].max);
};


/**
 * Normalizatsiya qilingan target qiymatni asl masshtabga qaytarish.
 */
const descaleTarget = (normVal, stats) =>
  normVal * (stats[TARGET].max - stats[TARGET].min) + stats[TARGET].min;

// ── MSE helper ────────────────────────────────────────────────────────────────
const mse = ys => {
  if (!ys.length) return 0;
  const m = mean(ys);
  return ys.reduce((s, v) => s + (v - m) ** 2, 0) / ys.length;
};

// ── Linear Regression (Gradient Descent) ─────────────────────────────────────
const linearRegression = (Xs, ys, lr = 0.05, epochs = 500) => {
  const n = Xs.length;
  const m = Xs[0].length;
  let w = new Array(m).fill(0);
  let b = 0;

  for (let e = 0; e < epochs; e++) {
    let dw = new Array(m).fill(0);
    let db = 0;
    for (let i = 0; i < n; i++) {
      const pred = Xs[i].reduce((s, x, j) => s + x * w[j], b);
      const err = pred - ys[i];
      dw = dw.map((v, j) => v + (err * Xs[i][j]) / n);
      db += err / n;
    }
    w = w.map((v, j) => v - lr * dw[j]);
    b -= lr * db;
  }
  return { w, b };
};

const linPredict = ({ w, b }, xs) =>
  xs.reduce((s, x, j) => s + x * w[j], b);

// ── Decision Tree (CART, regression) ─────────────────────────────────────────
const buildTree = (Xs, ys, depth = 0, maxDepth = 5, minSamples = 5) => {
  // Bo'sh yoki juda kichik massiv bo'lsa darhol leaf
  if (!ys.length || depth >= maxDepth || ys.length < minSamples) {
    return { leaf: true, value: ys.length > 0 ? mean(ys) : 0 };
  }

  let bestFeature = -1, bestThreshold = 0, bestGain = -Infinity;
  const parentMSE = mse(ys);

  for (let f = 0; f < Xs[0].length; f++) {
    const vals = [...new Set(Xs.map(x => x[f]))].sort((a, b) => a - b);
    for (let i = 0; i < vals.length - 1; i++) {
      const thr = (vals[i] + vals[i + 1]) / 2;
      const leftIdx = Xs.map((x, idx) => x[f] <= thr ? idx : -1).filter(i => i >= 0);
      const rightIdx = Xs.map((x, idx) => x[f] > thr ? idx : -1).filter(i => i >= 0);
      if (!leftIdx.length || !rightIdx.length) continue;
      const ly = leftIdx.map(i => ys[i]);
      const ry = rightIdx.map(i => ys[i]);
      const gain = parentMSE - (ly.length / ys.length) * mse(ly) - (ry.length / ys.length) * mse(ry);
      if (gain > bestGain) { bestGain = gain; bestFeature = f; bestThreshold = thr; }
    }
  }

  if (bestFeature < 0) return { leaf: true, value: mean(ys) };

  const lIdx = Xs.map((x, i) => x[bestFeature] <= bestThreshold ? i : -1).filter(i => i >= 0);
  const rIdx = Xs.map((x, i) => x[bestFeature] > bestThreshold ? i : -1).filter(i => i >= 0);

  return {
    leaf: false, feature: bestFeature, threshold: bestThreshold,
    left: buildTree(lIdx.map(i => Xs[i]), lIdx.map(i => ys[i]), depth + 1, maxDepth, minSamples),
    right: buildTree(rIdx.map(i => Xs[i]), rIdx.map(i => ys[i]), depth + 1, maxDepth, minSamples)
  };
};

const treePredict = (node, xs) => {
  if (node.leaf) return node.value;
  return xs[node.feature] <= node.threshold
    ? treePredict(node.left, xs)
    : treePredict(node.right, xs);
};

// ── Random Forest ─────────────────────────────────────────────────────────────
const buildForest = (Xs, ys, nTrees = 10) => {
  const trees = [];
  for (let t = 0; t < nTrees; t++) {
    const idx = Array.from({ length: Xs.length }, () => Math.floor(Math.random() * Xs.length));
    const bXs = idx.map(i => Xs[i]);
    const bys = idx.map(i => ys[i]);
    trees.push(buildTree(bXs, bys, 0, 6, 3));
  }
  return trees;
};

const forestPredict = (trees, xs) =>
  mean(trees.map(t => treePredict(t, xs)));

// ── Gradient Boosting (XGBoost-uslubi, additive trees) ───────────────────────
const buildGBM = (Xs, ys, nRounds = 15, lr = 0.1) => {
  const basePred = mean(ys);
  let preds = new Array(ys.length).fill(basePred);
  const estimators = [];

  for (let r = 0; r < nRounds; r++) {
    const residuals = ys.map((y, i) => y - preds[i]);
    const tree = buildTree(Xs, residuals, 0, 4, 5);
    preds = preds.map((p, i) => p + lr * treePredict(tree, Xs[i]));
    estimators.push(tree);
  }
  return { basePred, estimators, lr };
};

const gbmPredict = ({ basePred, estimators, lr }, xs) =>
  basePred + estimators.reduce((s, t) => s + lr * treePredict(t, xs), 0);

// ── Metrics ───────────────────────────────────────────────────────────────────
const rmse = (truths, preds) => {
  if (!truths.length || !preds.length) return 0;
  const error = truths.reduce((s, t, i) => {
    const p = isNaN(preds[i]) ? 0 : preds[i];
    return s + (t - p) ** 2;
  }, 0);
  return Math.sqrt(error / truths.length);
};

const r2Score = (truths, preds) => {
  if (!truths.length) return 0;
  const mu = mean(truths);
  const ssTot = truths.reduce((s, t) => s + (t - mu) ** 2, 0);
  const ssRes = truths.reduce((s, t, i) => {
    const p = isNaN(preds[i]) ? 0 : preds[i];
    return s + (t - p) ** 2;
  }, 0);
  if (ssTot === 0) return 1.0;
  const r2 = 1 - ssRes / ssTot;
  return isNaN(r2) ? 0 : r2;
};

// ── Main train function ───────────────────────────────────────────────────────
/**
 * Regression modellarini o'qitish.
 * @param {Array} data - participants jadvali satrlari
 * @returns {Object} { models, stats, metrics, trainedOn }
 *   stats - har ustun uchun min/max (normalizatsiya uchun)
 *   metrics - { linear, rf, gbm } x { rmse, r2 }
 */
const trainRegressionModels = (data) => {
  // Ma'lumotlarni tozalash va to'ldirish
  const clean = data.map(d => {
    const row = { ...d };
    // Agar qon bosimi bo'lmasa, o'rtacha qiymat bilan to'ldiramiz (o'chirib yubormaslik uchun)
    if (isNaN(parseFloat(row.systolic_bp))) row.systolic_bp = 120;
    if (isNaN(parseFloat(row.diastolic_bp))) row.diastolic_bp = 80;
    if (isNaN(parseFloat(row.bmi))) row.bmi = 22; // Default normal BMI

    return row;
  }).filter(d => {
    // Muhim bo'lgan boshqa xususiyatlar borligini tekshiramiz
    const REQUIRED = ['age', 'height_cm', 'weight_kg', 'duration_minutes', 'avg_heart_rate', 'calories_burned', 'daily_steps', 'endurance_level', 'sleep_hours', 'stress_level', 'hydration_level', 'systolic_bp', 'diastolic_bp'];
    return REQUIRED.every(f => d[f] !== null && d[f] !== undefined && !isNaN(parseFloat(d[f])));
  });

  console.log(`🧹 Data cleaning: ${data.length} -> ${clean.length} records remain.`);

  if (clean.length < 5) {
    throw new Error(`O'qitish uchun kamida 5 ta to'liq yozuv kerak. Hozirda: ${clean.length} ta. (Bazadagi jami: ${data.length})`);
  }



  // Feature Engineering
  const dataset = clean.map(d => {
    const intensityVal = d.intensity?.toLowerCase() === 'high' ? 3 : (d.intensity?.toLowerCase() === 'medium' ? 2 : 1);
    return {
      ...d,
      metabolic_index: (parseFloat(d.duration_minutes) || 0) * intensityVal * (parseFloat(d.avg_heart_rate) || 100) / 100
    };
  });


  // REG_FEATURES ga yangi indeksni qo'shish
  const augmentedFeatures = [...REG_FEATURES, 'metabolic_index'];

  // Har ustun uchun alohida Min-Max stats hisoblash
  const stats = computeMinMaxStats(dataset, [...REG_FEATURES, TARGET]);

  // Metabolic index stats qo'shish
  const metValues = dataset.map(d => {
    const intensityVal = INTENSITY_MAP[String(d.intensity || '').toLowerCase().trim()] || 2;
    return (parseFloat(d.duration_minutes) || 0) * intensityVal * (parseFloat(d.avg_heart_rate) || 100) / 100;
  });
  stats.metabolic_index = { min: Math.min(...metValues), max: Math.max(...metValues) };

  // Feature vektorlarni normalizatsiya qilish
  const Xs = dataset.map(d => encodeRow(d, stats));

  // Target qiymatlarni normalizatsiya qilish
  const normYs = dataset.map(d => scaleTarget(d, stats));


  // 80/20 train/test ajratish
  const splitIdx = Math.floor(dataset.length * 0.8);

  // Minimal xavfsizlik: agar dataset juda kichik bo'lsa, hammasini train va test qilib ko'ramiz
  let trainXs, testXs, trainNormYs, testNormYs;
  if (dataset.length < 10) {
    trainXs = testXs = Xs;
    trainNormYs = testNormYs = normYs;
  } else {
    trainXs = Xs.slice(0, splitIdx);
    testXs = Xs.slice(splitIdx);
    trainNormYs = normYs.slice(0, splitIdx);
    testNormYs = normYs.slice(splitIdx);
  }

  // Asl test qiymatlari (denormalizatsiya qilingan)
  const testYsReal = testNormYs.map(ny => descaleTarget(ny, stats));

  // --- Linear Regression ---
  const linModel = linearRegression(trainXs, trainNormYs, 0.05, 500);
  const linPreds = testXs.map(x => descaleTarget(linPredict(linModel, x), stats));

  // --- Random Forest ---
  const rfTrees = buildForest(trainXs, trainNormYs, 10);
  const rfPreds = testXs.map(x => descaleTarget(forestPredict(rfTrees, x), stats));

  // --- GBM ---
  const gbm = buildGBM(trainXs, trainNormYs, 15, 0.1);
  const gbmPreds = testXs.map(x => descaleTarget(gbmPredict(gbm, x), stats));

  const safeMetric = (val) => (isNaN(val) || val === null || !isFinite(val)) ? 0 : val;

  const metrics = {
    linear: { rmse: +safeMetric(rmse(testYsReal, linPreds)).toFixed(2), r2: +safeMetric(r2Score(testYsReal, linPreds)).toFixed(3) },
    rf: { rmse: +safeMetric(rmse(testYsReal, rfPreds)).toFixed(2), r2: +safeMetric(r2Score(testYsReal, rfPreds)).toFixed(3) },
    gbm: { rmse: +safeMetric(rmse(testYsReal, gbmPreds)).toFixed(2), r2: +safeMetric(r2Score(testYsReal, gbmPreds)).toFixed(3) }
  };

  return {
    models: { linModel, rfTrees, gbm },
    stats,
    metrics,
    trainedOn: dataset.length
  };
};

// ── Single-row prediction ─────────────────────────────────────────────────────
/**
 * Bitta sportchi uchun kaloriya sarfini bashorat qilish.
 * @param {Object} row - sportchi ma'lumotlari
 * @param {Object} trained - trainRegressionModels natijasi
 * @param {string} preferModel - 'linear' | 'rf' | 'gbm'
 * @returns {number} bashorat qilingan calories_burned (asl masshtabda)
 */
const predictCalories = (row, { models, stats }, preferModel = 'rf') => {
  const xs = encodeRow(row, stats);
  const { linModel, rfTrees, gbm } = models;

  let normPred;
  try {
    if (preferModel === 'linear') {
      normPred = linPredict(linModel, xs);
    } else if (preferModel === 'gbm') {
      normPred = gbmPredict(gbm, xs);
    } else {
      normPred = forestPredict(rfTrees, xs);
    }
  } catch (err) {
    console.error('Prediction error:', err);
    normPred = NaN;
  }

  // NaN guard: agar model noto'g'ri natija bersa, o'rtacha qiymat qaytarilsin
  if (isNaN(normPred) || !isFinite(normPred)) {
    return +((stats[TARGET].min + stats[TARGET].max) / 2).toFixed(1);
  }

  // [0,1] dan tashqariga chiqmesligi uchun clamp
  const clamped = Math.max(0, Math.min(1, normPred));
  return +descaleTarget(clamped, stats).toFixed(1);
};


// ── KNN: activity_type bir xil bo'lgan o'xshash 3 ta sportchini topish ────────
/**
 * Predict qilingan sportchiga o'xshash 3 ta sportchini bazadan topish.
 * Muhim shart: activity_type bir xil bo'lishi kerak.
 *
 * @param {Object} inputRow - kiritilgan sportchi ma'lumotlari
 * @param {Array}  allRows  - bazadan olingan barcha yozuvlar
 * @param {Object} stats    - Min-Max normalizatsiya stats
 * @param {number} k        - qancha qo'shni qaytarilsin (default 3)
 * @returns {Array} eng yaqin 3 sportchi
 */
const findSimilarAthletes = (inputRow, allRows, stats, k = 3) => {
  // activity_type ni katta-kichik harfdan mustaqil solishtirish
  // DB da 'Running', form da 'running' bo'lishi mumkin
  const inputActivity = String(inputRow.activity_type || '').toLowerCase().trim();

  // Bir xil activity_type bo'lgan sportchilarni filtrlash (case-insensitive)
  const sameActivity = allRows.filter(r =>
    String(r.activity_type || '').toLowerCase().trim() === inputActivity
  );

  if (sameActivity.length === 0) return [];

  const inputVec = encodeRow(inputRow, stats);

  // Evklid masofasini hisoblash
  const withDist = sameActivity.map(r => {
    const vec = encodeRow(r, stats);
    const dist = Math.sqrt(vec.reduce((s, v, i) => s + (v - inputVec[i]) ** 2, 0));
    return { ...r, _distance: dist };
  });

  console.log(withDist)

  // Eng yaqin k ta sportchini olish
  return withDist
    .sort((a, b) => a._distance - b._distance)
    .slice(0, k)
    .map(r => ({
      id: r.id,
      participant_id: r.participant_id,
      activity_type: r.activity_type,
      duration_minutes: parseFloat(r.duration_minutes || 0).toFixed(0),
      calories_burned: parseFloat(r.calories_burned || 0).toFixed(1),
      avg_heart_rate: r.avg_heart_rate,
      intensity: r.intensity,
      age: r.age,
      bmi: r.bmi,
      gender: r.gender,
      height_cm: r.height_cm,
      weight_kg: r.weight_kg,
      systolic_bp: parseFloat(r.systolic_bp || 0).toFixed(0),
      diastolic_bp: parseFloat(r.diastolic_bp || 0).toFixed(0),
      sleep_hours: r.sleep_hours,
      health_condition: r.health_condition,
      // Similarity calculation: exponential decay for more natural 0-100% scale
      // e^(-d) is better than 1/(1+d) for similarity
      distance: +r._distance.toFixed(4),
      similarity: Math.round(Math.exp(-r._distance) * 100)
    }));
};

module.exports = {
  trainRegressionModels,
  predictCalories,
  findSimilarAthletes,
  REG_FEATURES,
  TARGET
};
