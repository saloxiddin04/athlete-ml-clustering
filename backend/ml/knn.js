/**
 * K-Nearest Neighbors (KNN) Classifier
 * Used for predicting the cluster of a new athlete
 * based on trained athlete data
 * 
 * Algorithm:
 * 1. Normalize new athlete features using same scale as training data
 * 2. Compute distance to all trained athletes
 * 3. Select k nearest neighbors
 * 4. Vote: majority cluster among neighbors wins
 */

const { euclideanDistance } = require('./kmeans');

/**
 * Predict cluster for a new athlete using KNN
 * 
 * @param {Object} newAthlete - { height_cm, weight_kg, avg_heart_rate, duration_minutes }
 * @param {Array} trainedAthletes - Athletes with cluster assignments from DB (participants table)
 * @param {string} algorithm - 'kmeans' or 'hierarchical'
 * @param {number} k - Number of neighbors to consider
 * @returns {Object} Prediction results
 */
const predictCluster = (newAthlete, trainedAthletes, algorithm = 'kmeans', k = 5) => {
  if (!trainedAthletes || trainedAthletes.length === 0) {
    throw new Error('No trained data available for prediction');
  }

  // participants jadvalidagi mavjud ustunlarga mos featurelar
  // (muscle_mass va run_time jadvalda yo'q)
  const features = ['height_cm', 'weight_kg', 'avg_heart_rate', 'duration_minutes'];

  // Compute min/max from training data for normalization
  const mins = {};
  const maxs = {};
  features.forEach(f => {
    mins[f] = Math.min(...trainedAthletes.map(a => parseFloat(a[f])));
    maxs[f] = Math.max(...trainedAthletes.map(a => parseFloat(a[f])));
  });

  // Normalize new athlete
  const newFeatures = features.map(f =>
    maxs[f] === mins[f] ? 0 : (parseFloat(newAthlete[f]) - mins[f]) / (maxs[f] - mins[f])
  );

  // Normalize all trained athletes
  const trainedNormalized = trainedAthletes.map(athlete => ({
    ...athlete,
    clusterLabel: algorithm === 'kmeans' ? athlete.cluster_kmeans : athlete.cluster_hierarchical,
    normalizedFeatures: features.map(f =>
      maxs[f] === mins[f] ? 0 : (parseFloat(athlete[f]) - mins[f]) / (maxs[f] - mins[f])
    )
  })).filter(a => a.clusterLabel !== null && a.clusterLabel !== undefined);

  if (trainedNormalized.length === 0) {
    throw new Error(`No trained athletes with ${algorithm} cluster assignments`);
  }

  // Compute distances to all trained athletes
  const withDistances = trainedNormalized.map(athlete => ({
    ...athlete,
    distance: euclideanDistance(newFeatures, athlete.normalizedFeatures)
  }));

  // Sort by distance, take k nearest
  const kNearest = withDistances.sort((a, b) => a.distance - b.distance).slice(0, Math.min(k, withDistances.length));

  // Vote: count cluster occurrences
  const votes = {};
  kNearest.forEach(neighbor => {
    const cluster = neighbor.clusterLabel;
    votes[cluster] = (votes[cluster] || 0) + 1;
  });

  // Weighted vote (closer neighbors count more)
  const weightedVotes = {};
  kNearest.forEach(neighbor => {
    const cluster = neighbor.clusterLabel;
    const weight = neighbor.distance === 0 ? 1000 : 1 / neighbor.distance;
    weightedVotes[cluster] = (weightedVotes[cluster] || 0) + weight;
  });

  const predictedCluster = parseInt(
    Object.entries(weightedVotes).sort((a, b) => b[1] - a[1])[0][0]
  );

  const confidence = (votes[predictedCluster] / k) * 100;

  return {
    predictedCluster,
    confidence: parseFloat(confidence.toFixed(1)),
    nearestNeighbors: kNearest.slice(0, 3).map(n => ({
      id: n.id,
      participant_id: n.participant_id, // participants jadvalida 'name' yo'q
      distance: parseFloat(n.distance.toFixed(4)),
      cluster: n.clusterLabel
    })),
    votes
  };
};

module.exports = { predictCluster };
