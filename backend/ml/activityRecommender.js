/**
 * Activity Recommendation System
 * Input:  age, bmi, health_condition, smoke_status, stress_level, (+ gender, sleep_hours)
 * Output: Recommended activity_type, Intensity (Low/Medium/High), Duration (minutes)
 *
 * Method: KNN Classification – finds k nearest athletes in the training set
 *         and votes on what activity type and intensity they performed best with.
 */

const REC_FEATURES = ['age', 'bmi', 'stress_level', 'sleep_hours', 'avg_heart_rate', 'endurance_level'];

// Encode categorical fields into numbers
const encodeRow = (row) => {
  const healthMap   = { healthy: 0, asthma: 1, diabetes: 2, hypertension: 3, 'heart disease': 4 };
  const smokeMap    = { never: 0, former: 1, current: 2 };
  const genderMap   = { male: 0, female: 1, other: 0.5 };

  return [
    ...REC_FEATURES.map(f => parseFloat(row[f] ?? 0)),
    healthMap[String(row.health_condition ?? '').toLowerCase()] ?? 0,
    smokeMap[String(row.smoke_status ?? '').toLowerCase()] ?? 0,
    genderMap[String(row.gender ?? '').toLowerCase()] ?? 0
  ];
};

const euclidean = (a, b) =>
  Math.sqrt(a.reduce((s, v, i) => s + (v - (b[i] ?? 0)) ** 2, 0));

// Z-score normalisation stats
const buildStats = (data) => {
  const dim = encodeRow(data[0]).length;
  const stats = Array.from({ length: dim }, (_, i) => {
    const vals = data.map(d => encodeRow(d)[i]);
    const mu   = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sigma = Math.sqrt(vals.reduce((s, v) => s + (v - mu) ** 2, 0) / vals.length) || 1;
    return { mu, sigma };
  });
  return stats;
};

const normalise = (vec, stats) => vec.map((v, i) => (v - stats[i].mu) / stats[i].sigma);

// Majority vote helper
const vote = (arr) => {
  const counts = {};
  arr.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
};

/**
 * Build recommender model from DB rows.
 * Returns a closure that can answer recommendation queries.
 */
const buildRecommender = (trainingData) => {
  const valid = trainingData.filter(d =>
    d.activity_type && d.intensity && d.duration_minutes
  );
  if (valid.length < 5) throw new Error('Need at least 5 labelled records to build recommender.');

  const stats = buildStats(valid);
  const encodedSet = valid.map(d => ({
    vec: normalise(encodeRow(d), stats),
    activity_type:    String(d.activity_type).toLowerCase(),
    intensity:        String(d.intensity).toLowerCase(),
    duration_minutes: parseFloat(d.duration_minutes)
  }));

  return { stats, encodedSet };
};

/**
 * Recommend activity for a user profile.
 * @param {Object} profile  – { age, bmi, health_condition, smoke_status, stress_level, …
 *                              preferred_activity? – foydalanuvchi tanlagan faoliyat }
 * @param {Object} model    – result of buildRecommender()
 * @param {number} k        – neighbours (default 7)
 */
const recommend = (profile, { stats, encodedSet }, k = 7) => {
  const queryVec = normalise(encodeRow(profile), stats);

  const neighbours = encodedSet
    .map(e => ({ ...e, dist: euclidean(queryVec, e.vec) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, k);

  // Agar foydalanuvchi faoliyat turini tanlagan bo'lsa,
  // intensivlik va davomiylikni shu faoliyat qo'shnilaridan hisoblash
  const preferred = profile.preferred_activity
    ? String(profile.preferred_activity).toLowerCase().trim()
    : null;

  let recommendedActivity;
  let matchedNeighbours;

  if (preferred) {
    // Tanlangan faoliyatga mos qo'shnilarni ajrat
    matchedNeighbours = neighbours.filter(n => n.activity_type === preferred);

    if (matchedNeighbours.length > 0) {
      // Mos qo'shnilar topildi — ulardan intensivlik va davomiylik hisoblash
      recommendedActivity = preferred;
    } else {
      // Mos qo'shni topilmasa — barcha qo'shnilardan ovoz berish
      matchedNeighbours = neighbours;
      recommendedActivity = vote(neighbours.map(n => n.activity_type));
    }
  } else {
    matchedNeighbours = neighbours;
    recommendedActivity = vote(neighbours.map(n => n.activity_type));
  }

  const recommendedIntensity = vote(matchedNeighbours.map(n => n.intensity));
  const recommendedDuration  = Math.round(
    matchedNeighbours.reduce((s, n) => s + n.duration_minutes, 0) / matchedNeighbours.length
  );

  // Intensity override based on health condition & BMI
  const healthCond = String(profile.health_condition ?? '').toLowerCase();
  const bmi        = parseFloat(profile.bmi ?? 22);
  const age        = parseFloat(profile.age ?? 30);

  let safeIntensity = recommendedIntensity;
  if (['heart disease', 'hypertension'].includes(healthCond) || bmi > 35 || age > 65) {
    safeIntensity = 'low';
  } else if (['diabetes', 'asthma'].includes(healthCond) && safeIntensity === 'high') {
    safeIntensity = 'medium';
  }

  // Health tip
  const tips = {
    'heart disease': 'Keep HR < 110 BPM. Prefer walking or light cycling.',
    hypertension:    'Avoid heavy resistance. Prefer rhythmic aerobic exercise.',
    diabetes:        'Post-meal walks are highly effective. Monitor blood sugar.',
    asthma:          'Use an inhaler before sessions. Avoid cold/dry environments.',
    healthy:         'You are cleared for any intensity. Push your limits!'
  };

  const confidence = preferred && matchedNeighbours.length > 0
    ? +((matchedNeighbours.length / k) * 100).toFixed(0)
    : +(matchedNeighbours.filter(n => n.activity_type === recommendedActivity).length / k * 100).toFixed(0);

  return {
    activity_type:    recommendedActivity,
    intensity:        safeIntensity,
    duration_minutes: recommendedDuration,
    health_tip:       tips[healthCond] ?? 'Listen to your body and stay hydrated.',
    confidence
  };
};

module.exports = { buildRecommender, recommend };
