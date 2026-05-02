/**
 * K-Means Clustering Algorithm
 * Pure JavaScript implementation - no external ML libraries needed
 * 
 * Algorithm:
 * 1. Initialize k centroids randomly from data points
 * 2. Assign each point to nearest centroid (Euclidean distance)
 * 3. Recompute centroids as mean of assigned points
 * 4. Repeat until convergence or max iterations
 */

/**
 * Compute Euclidean distance between two feature vectors
 */
const euclideanDistance = (a, b) => {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
};

/**
 * Standardize features using Z-score (mean=0, std=1)
 * More robust than Min-Max for most clustering tasks
 */
const normalizeFeatures = (data) => {
  const features = ['height', 'weight', 'muscle_mass', 'run_time'];
  const stats = {};

  features.forEach(f => {
    const vals = data.map(d => d[f]);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const std = Math.sqrt(vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length) || 1;
    stats[f] = { mean, std };
  });

  return {
    normalized: data.map(d => ({
      ...d,
      features: features.map(f => (d[f] - stats[f].mean) / stats[f].std)
    })),
    stats,
    featureNames: features
  };
};

/**
 * K-Means++ initialization for better centroid seeding
 * Reduces chance of poor clustering from bad initial centroids
 */
const initializeCentroidsKMeansPlusPlus = (data, k) => {
  const centroids = [];
  // Pick first centroid randomly
  const firstIdx = Math.floor(Math.random() * data.length);
  centroids.push([...data[firstIdx].features]);

  for (let i = 1; i < k; i++) {
    // Compute squared distances to nearest centroid for each point
    const distances = data.map(point => {
      const minDist = Math.min(...centroids.map(c => euclideanDistance(point.features, c)));
      return minDist * minDist;
    });

    const totalDist = distances.reduce((s, d) => s + d, 0);
    let threshold = Math.random() * totalDist;

    // Pick next centroid proportional to distance squared
    for (let j = 0; j < distances.length; j++) {
      threshold -= distances[j];
      if (threshold <= 0) {
        centroids.push([...data[j].features]);
        break;
      }
    }
  }

  return centroids;
};

/**
 * Assign each data point to its nearest centroid
 */
const assignClusters = (data, centroids) => {
  return data.map(point => {
    let minDist = Infinity;
    let cluster = 0;
    centroids.forEach((centroid, i) => {
      const dist = euclideanDistance(point.features, centroid);
      if (dist < minDist) {
        minDist = dist;
        cluster = i;
      }
    });
    return { ...point, cluster, distToCenter: minDist };
  });
};

/**
 * Recompute centroids as the mean of all assigned points
 */
const updateCentroids = (assignedData, k, featureDim) => {
  const newCentroids = Array.from({ length: k }, () => new Array(featureDim).fill(0));
  const counts = new Array(k).fill(0);

  assignedData.forEach(point => {
    point.features.forEach((val, i) => {
      newCentroids[point.cluster][i] += val;
    });
    counts[point.cluster]++;
  });

  return newCentroids.map((centroid, ci) =>
    counts[ci] === 0 ? centroid : centroid.map(v => v / counts[ci])
  );
};

/**
 * Check if centroids have converged (moved less than threshold)
 */
const hasConverged = (oldCentroids, newCentroids, threshold = 1e-6) => {
  return oldCentroids.every((c, i) => euclideanDistance(c, newCentroids[i]) < threshold);
};

/**
 * Compute inertia (within-cluster sum of squared distances)
 */
const computeInertia = (assignedData) => {
  return assignedData.reduce((sum, point) => sum + Math.pow(point.distToCenter, 2), 0);
};

/**
 * Compute Silhouette Score for the clustering
 * Range: [-1, 1], higher is better
 * a(i) = mean intra-cluster distance
 * b(i) = mean distance to nearest other cluster
 * s(i) = (b(i) - a(i)) / max(a(i), b(i))
 */
const computeSilhouetteScore = (assignedData) => {
  const n = assignedData.length;
  if (n < 2) return 0;

  // Get unique clusters
  const clusters = [...new Set(assignedData.map(d => d.cluster))];
  if (clusters.length < 2) return 0;

  // Group data by cluster
  const clusterGroups = {};
  clusters.forEach(c => {
    clusterGroups[c] = assignedData.filter(d => d.cluster === c);
  });

  const scores = assignedData.map(point => {
    const sameCluster = clusterGroups[point.cluster].filter(p => p !== point);

    // a(i): mean distance to same cluster members
    const a = sameCluster.length === 0 ? 0 :
      sameCluster.reduce((s, p) => s + euclideanDistance(point.features, p.features), 0) / sameCluster.length;

    // b(i): mean distance to nearest other cluster
    const otherClusters = clusters.filter(c => c !== point.cluster);
    const b = Math.min(...otherClusters.map(c => {
      const members = clusterGroups[c];
      return members.reduce((s, p) => s + euclideanDistance(point.features, p.features), 0) / members.length;
    }));

    const maxAB = Math.max(a, b);
    return maxAB === 0 ? 0 : (b - a) / maxAB;
  });

  return scores.reduce((s, v) => s + v, 0) / scores.length;
};

/**
 * Determine optimal k using elbow method
 */
const findOptimalK = (data, maxK = 6) => {
  const inertias = [];
  for (let k = 2; k <= Math.min(maxK, data.length - 1); k++) {
    const result = runKMeans(data, k, 1); // Quick run
    inertias.push({ k, inertia: result.inertia });
  }

  // Simple elbow detection: find max rate of decrease change
  let optimalK = 3;
  let maxDiff = 0;
  for (let i = 1; i < inertias.length - 1; i++) {
    const diff1 = inertias[i - 1].inertia - inertias[i].inertia;
    const diff2 = inertias[i].inertia - inertias[i + 1].inertia;
    if (diff1 - diff2 > maxDiff) {
      maxDiff = diff1 - diff2;
      optimalK = inertias[i].k;
    }
  }
  return optimalK;
};

/**
 * Run K-Means algorithm once
 */
const runKMeans = (normalizedData, k, maxIterations = 100) => {
  let centroids = initializeCentroidsKMeansPlusPlus(normalizedData, k);
  let assigned = [];
  let iterations = 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations++;
    assigned = assignClusters(normalizedData, centroids);
    const newCentroids = updateCentroids(assigned, k, centraloids => centraloids, centroids[0].length);

    if (hasConverged(centroids, newCentroids)) break;
    centroids = newCentroids;
  }

  return {
    assigned,
    centroids,
    inertia: computeInertia(assigned),
    iterations
  };
};

// Fix the runKMeans function - it had a bug in updateCentroids call
const runKMeansFixed = (normalizedData, k, maxIterations = 100) => {
  let centroids = initializeCentroidsKMeansPlusPlus(normalizedData, k);
  let assigned = [];
  let iterations = 0;
  const featureDim = normalizedData[0].features.length;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations++;
    assigned = assignClusters(normalizedData, centroids);
    const newCentroids = updateCentroids(assigned, k, featureDim);

    if (hasConverged(centroids, newCentroids)) break;
    centroids = newCentroids;
  }

  return {
    assigned,
    centroids,
    inertia: computeInertia(assigned),
    iterations
  };
};

/**
 * Main K-Means clustering function
 * Runs multiple times and picks best result (lowest inertia)
 * 
 * @param {Array} athletes - Array of athlete objects from DB
 * @param {number} k - Number of clusters (auto-detected if not provided)
 * @param {number} runs - Number of random restarts
 * @returns {Object} Clustering results with scores
 */
const kMeansClustering = (athletes, k = null, runs = 10) => {
  if (athletes.length < 2) {
    throw new Error('Need at least 2 athletes for clustering');
  }

  const { normalized } = normalizeFeatures(athletes);

  // Auto-select k if not provided
  const numClusters = k || Math.min(findOptimalK(normalized), Math.floor(Math.sqrt(athletes.length / 2)));
  const finalK = Math.max(2, Math.min(numClusters, athletes.length - 1));

  // Run multiple times, pick best (lowest inertia)
  let bestResult = null;
  let bestInertia = Infinity;

  for (let run = 0; run < runs; run++) {
    const result = runKMeansFixed(normalized, finalK);
    if (result.inertia < bestInertia) {
      bestInertia = result.inertia;
      bestResult = result;
    }
  }

  const silhouetteScore = computeSilhouetteScore(bestResult.assigned);

  // Build cluster summaries
  const clusters = [];
  for (let i = 0; i < finalK; i++) {
    const members = bestResult.assigned.filter(d => d.cluster === i);
    clusters.push({
      id: i,
      size: members.length,
      members: members.map(m => ({ id: m.id, name: m.name })),
      centroid: {
        height: members.length > 0 ? members.reduce((s, m) => s + m.height, 0) / members.length : 0,
        weight: members.length > 0 ? members.reduce((s, m) => s + m.weight, 0) / members.length : 0,
        muscle_mass: members.length > 0 ? members.reduce((s, m) => s + m.muscle_mass, 0) / members.length : 0,
        run_time: members.length > 0 ? members.reduce((s, m) => s + m.run_time, 0) / members.length : 0,
      }
    });
  }

  return {
    assignments: bestResult.assigned.map(d => ({ id: d.id, cluster: d.cluster })),
    clusters,
    k: finalK,
    score: parseFloat(silhouetteScore.toFixed(4)),
    inertia: parseFloat(bestResult.inertia.toFixed(4)),
    iterations: bestResult.iterations
  };
};

module.exports = { kMeansClustering, normalizeFeatures, euclideanDistance };
