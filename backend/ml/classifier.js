/**
 * ML Utils for Health & Fitness Dataset
 */

const FEATURES = ['age', 'height_cm', 'weight_kg', 'bmi', 'duration_minutes', 'calories_burned', 'daily_steps', 'avg_heart_rate', 'resting_heart_rate', 'systolic_bp', 'diastolic_bp', 'endurance_level', 'sleep_hours', 'stress_level', 'hydration_level'];

/**
 * Normalize features for classification
 */
const normalize = (data) => {
	const stats = {};
	FEATURES.forEach(f => {
		const vals = data.map(d => parseFloat(d[f] || 0));
		const sum = vals.reduce((a, b) => a + b, 0);
		const mean = sum / vals.length;
		const std = Math.sqrt(vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length);
		stats[f] = {mean, std: std || 1};
	});

	const normalized = data.map(d => {
		const obj = {...d};
		FEATURES.forEach(f => {
			obj[`norm_${f}`] = (parseFloat(d[f] || 0) - stats[f].mean) / stats[f].std;
		});
		return obj;
	});

	return {normalized, stats};
};

/**
 * Simplified PCA Implementation
 * Projects multi-dimensional data into 2D space
 */
const runPCA = (normalizedData) => {
	if (normalizedData.length < 2) return normalizedData.map(d => ({...d, pca_x: 0, pca_y: 0}));

	const matrix = normalizedData.map(d => FEATURES.map(f => d[`norm_${f}`]));
	const n = matrix.length;
	const m = FEATURES.length;

	// 1. Covariance Matrix (m x m)
	const cov = Array(m).fill(0).map(() => Array(m).fill(0));
	for (let i = 0; i < m; i++) {
		for (let j = 0; j < m; j++) {
			let sum = 0;
			for (let k = 0; k < n; k++) {
				sum += matrix[k][i] * matrix[k][j];
			}
			cov[i][j] = sum / (n - 1);
		}
	}

	// 2. Power Iteration to find top 2 Eigenvectors
	const getEigenvector = (mCov, iterations = 10) => {
		let vec = Array(m).fill(0).map(() => Math.random());
		for (let i = 0; i < iterations; i++) {
			let nextVec = Array(m).fill(0);
			for (let r = 0; r < m; r++) {
				for (let c = 0; c < m; c++) {
					nextVec[r] += mCov[r][c] * vec[c];
				}
			}
			const norm = Math.sqrt(nextVec.reduce((a, b) => a + b * b, 0));
			vec = nextVec.map(v => v / (norm || 1));
		}
		return vec;
	};

	const e1 = getEigenvector(cov);

	// Deflate to find second component
	const cov2 = cov.map((row, i) => row.map((val, j) => val - e1[i] * e1[j] * val));
	const e2 = getEigenvector(cov2);

	// 3. Project data onto top 2 components
	return normalizedData.map(d => {
		let x = 0, y = 0;
		FEATURES.forEach((f, idx) => {
			const val = d[`norm_${f}`];
			x += val * e1[idx];
			y += val * e2[idx];
		});
		return {...d, pca_x: x, pca_y: y};
	});
};

/**
 * Predict fitness_level using KNN
 */
const predictFitnessLevel = (target, trainingSet, k = 5) => {
	if (trainingSet.length === 0) return 'Unknown';

	const getDistance = (p1, p2) => {
		let sum = 0;
		FEATURES.forEach(f => {
			sum += Math.pow(p1[`norm_${f}`] - p2[`norm_${f}`], 2);
		});
		return Math.sqrt(sum);
	};

	const distances = trainingSet.map(p => ({
		label: p.fitness_level,
		dist: getDistance(target, p)
	}));

	distances.sort((a, b) => a.dist - b.dist);
	const neighbors = distances.slice(0, k);
	const votes = {};
	neighbors.forEach(n => {
		const label = n.label === null ? 'Unknown' : n.label;
		votes[label] = (votes[label] || 0) + 1;
	});
	return Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
};

/**
 * K-Means Clustering for EDA
 */
const runKMeans = (data, k = 3, maxIterations = 10) => {
	if (data.length < k) return data.map(d => ({...d, cluster: 0}));

	// 1. Initialize centroids randomly
	let centroids = data.slice(0, k).map(d => {
		const centroid = {};
		FEATURES.forEach(f => {
			centroid[f] = parseFloat(d[f] || 0);
		});
		return centroid;
	});

	let clusters = new Array(data.length).fill(0);

	for (let iter = 0; iter < maxIterations; iter++) {
		// 2. Assign data points to nearest centroid
		let changed = false;
		data.forEach((d, idx) => {
			let minDist = Infinity;
			let closestCluster = 0;
			centroids.forEach((c, cIdx) => {
				let dist = 0;
				FEATURES.forEach(f => {
					dist += Math.pow(parseFloat(d[f] || 0) - c[f], 2);
				});
				if (dist < minDist) {
					minDist = dist;
					closestCluster = cIdx;
				}
			});
			if (clusters[idx] !== closestCluster) {
				clusters[idx] = closestCluster;
				changed = true;
			}
		});

		if (!changed) break;

		// 3. Update centroids
		const newCentroids = Array(k).fill(0).map(() => {
			const obj = {};
			FEATURES.forEach(f => {
				obj[f] = 0;
			});
			obj._count = 0;
			return obj;
		});

		data.forEach((d, idx) => {
			const cIdx = clusters[idx];
			FEATURES.forEach(f => {
				newCentroids[cIdx][f] += parseFloat(d[f] || 0);
			});
			newCentroids[cIdx]._count++;
		});

		centroids = newCentroids.map(c => {
			const obj = {};
			FEATURES.forEach(f => {
				obj[f] = c._count > 0 ? c[f] / c._count : 0;
			});
			return obj;
		});
	}

	return data.map((d, idx) => ({...d, cluster: clusters[idx]}));
};

module.exports = {normalize, runPCA, predictFitnessLevel, runKMeans};
