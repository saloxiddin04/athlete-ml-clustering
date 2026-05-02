/**
 * Personalized Fitness Score Engine
 * Outputs: 0-100 fitness score per athlete
 * Formula blends weighted domain knowledge + ML-calibrated normalization
 *
 * Anomaly Detection via Isolation Forest (pure JS)
 */

// ── Fitness Score ─────────────────────────────────────────────────────────────
const SCORE_WEIGHTS = {
  calories_burned:  0.22,
  endurance_level:  0.20,
  avg_heart_rate:   0.15,  // Inverse – lower resting HR = fitter
  sleep_hours:      0.18,
  stress_level:     0.12,  // Inverse
  daily_steps:      0.13
};

/**
 * Compute fitness score for a single athlete row.
 * Returns 0–100.
 */
const computeFitnessScore = (row, globalStats) => {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Each component normalized 0-1 vs population
  const { min, max } = globalStats;

  const caloriesNorm   = clamp((parseFloat(row.calories_burned ?? 0) - min.calories_burned) / (max.calories_burned - min.calories_burned || 1), 0, 1);
  const enduranceNorm  = clamp((parseFloat(row.endurance_level ?? 0) - min.endurance_level) / (max.endurance_level - min.endurance_level || 1), 0, 1);
  const hrNorm         = 1 - clamp((parseFloat(row.avg_heart_rate ?? 70) - min.avg_heart_rate) / (max.avg_heart_rate - min.avg_heart_rate || 1), 0, 1); // inverted
  const sleepNorm      = clamp((parseFloat(row.sleep_hours ?? 7) - min.sleep_hours) / (max.sleep_hours - min.sleep_hours || 1), 0, 1);
  const stressNorm     = 1 - clamp((parseFloat(row.stress_level ?? 5) - min.stress_level) / (max.stress_level - min.stress_level || 1), 0, 1); // inverted
  const stepsNorm      = clamp((parseFloat(row.daily_steps ?? 0) - min.daily_steps) / (max.daily_steps - min.daily_steps || 1), 0, 1);

  const raw = SCORE_WEIGHTS.calories_burned * caloriesNorm
            + SCORE_WEIGHTS.endurance_level  * enduranceNorm
            + SCORE_WEIGHTS.avg_heart_rate   * hrNorm
            + SCORE_WEIGHTS.sleep_hours      * sleepNorm
            + SCORE_WEIGHTS.stress_level     * stressNorm
            + SCORE_WEIGHTS.daily_steps      * stepsNorm;

  // BMI penalty
  const bmi = parseFloat(row.bmi ?? 22);
  const bmiPenalty = bmi > 30 ? 0.05 : bmi > 25 ? 0.02 : 0;
  const smokePenalty = String(row.smoke_status ?? '').toLowerCase() === 'current' ? 0.05 : 0;

  return Math.round(Math.min(1, Math.max(0, raw - bmiPenalty - smokePenalty)) * 100);
};

const buildGlobalStats = (data) => {
  const fields = ['calories_burned', 'endurance_level', 'avg_heart_rate', 'sleep_hours', 'stress_level', 'daily_steps'];
  const min = {}, max = {};
  fields.forEach(f => {
    const vals = data.map(d => parseFloat(d[f] ?? 0)).filter(v => !isNaN(v));
    min[f] = Math.min(...vals);
    max[f] = Math.max(...vals);
  });
  return { min, max };
};

// ── Isolation Forest ─────────────────────────────────────────────────────────
const ANOMALY_FEATURES = [
  'avg_heart_rate', 'resting_heart_rate', 'sleep_hours',
  'stress_level', 'bmi', 'calories_burned', 'daily_steps'
];

const encodeAnomaly = (row) =>
  ANOMALY_FEATURES.map(f => parseFloat(row[f] ?? 0));

// Isolation Tree node
const buildITree = (X, depth = 0, maxDepth = 8) => {
  const n = X.length;
  if (n <= 1 || depth >= maxDepth) return { leaf: true, size: n };

  // Pick random feature and random split point
  const f = Math.floor(Math.random() * X[0].length);
  const vals = X.map(r => r[f]);
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);
  if (mn === mx) return { leaf: true, size: n };

  const q = mn + Math.random() * (mx - mn);
  const left  = X.filter(r => r[f] < q);
  const right = X.filter(r => r[f] >= q);

  return {
    leaf: false, feature: f, threshold: q,
    left:  buildITree(left,  depth + 1, maxDepth),
    right: buildITree(right, depth + 1, maxDepth)
  };
};

const pathLength = (node, x, depth = 0) => {
  if (node.leaf) return depth + harmonicNumber(node.size);
  return x[node.feature] < node.threshold
    ? pathLength(node.left,  x, depth + 1)
    : pathLength(node.right, x, depth + 1);
};

const harmonicNumber = (n) => {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  return 2 * (Math.log(n - 1) + 0.5772156649) - 2 * (n - 1) / n;
};

const buildIsolationForest = (data, nTrees = 50, sampleSize = 256) => {
  const encoded = data.map(encodeAnomaly);
  const trees = [];
  for (let t = 0; t < nTrees; t++) {
    // Random sub-sample
    const sample = [];
    for (let i = 0; i < Math.min(sampleSize, encoded.length); i++) {
      sample.push(encoded[Math.floor(Math.random() * encoded.length)]);
    }
    trees.push(buildITree(sample));
  }
  const cn = harmonicNumber(Math.min(sampleSize, encoded.length));
  return { trees, cn };
};

const anomalyScore = ({ trees, cn }, row) => {
  const x = encodeAnomaly(row);
  const avgPath = trees.reduce((s, t) => s + pathLength(t, x), 0) / trees.length;
  return Math.pow(2, -avgPath / cn); // 0.5 = normal, →1 = anomaly
};

/**
 * Score a batch of rows and flag anomalies (score > threshold).
 */
const detectAnomalies = (model, data, threshold = 0.60) =>
  data.map(row => ({
    id:       row.id,
    score:    +anomalyScore(model, row).toFixed(4),
    isAnomaly: anomalyScore(model, row) > threshold,
    reasons:   getReason(row)
  }));

const getReason = (row) => {
  const reasons = [];
  const hr    = parseFloat(row.avg_heart_rate ?? 70);
  const rhr   = parseFloat(row.resting_heart_rate ?? 65);
  const sleep = parseFloat(row.sleep_hours ?? 7);
  const stress= parseFloat(row.stress_level ?? 5);
  const bmi   = parseFloat(row.bmi ?? 22);

  if (hr > 170 || hr < 40) reasons.push(`Abnormal avg HR: ${hr} BPM`);
  if (rhr > 100)            reasons.push(`High resting HR: ${rhr} BPM`);
  if (sleep < 4)            reasons.push(`Critical sleep deficit: ${sleep}h`);
  if (stress >= 9)          reasons.push(`Extreme stress: ${stress}/10`);
  if (bmi > 40 || bmi < 14) reasons.push(`Critical BMI: ${bmi}`);

  return reasons.length ? reasons : ['Multivariate outlier detected'];
};

module.exports = {
  computeFitnessScore,
  buildGlobalStats,
  buildIsolationForest,
  detectAnomalies,
  anomalyScore
};
