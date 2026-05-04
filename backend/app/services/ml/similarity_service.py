import numpy as np
from sklearn.metrics.pairwise import cosine_similarity, euclidean_distances

class SimilarityService:
    @staticmethod
    def get_similar_athletes(input_vector, reference_vectors, reference_data, feature_names, k=5):
        # 1. Weights as per requirements
        weights = []
        for name in feature_names:
            if 'duration_minutes' in name: weights.append(2.0)
            elif 'avg_heart_rate' in name: weights.append(2.0)
            elif 'bmi' in name: weights.append(1.0)
            elif 'age' in name: weights.append(1.0)
            elif 'stress_level' in name: weights.append(0.5)
            else: weights.append(0.8)
        
        weights = np.array(weights)
        
        # 2. Weighted Euclidean
        # Multiply vectors by sqrt(weights) to apply weights in standard euclidean formula
        w_sqrt = np.sqrt(weights)
        input_w = input_vector * w_sqrt
        ref_w = reference_vectors * w_sqrt
        
        dists = euclidean_distances(input_w.reshape(1, -1), ref_w)[0]
        cosines = cosine_similarity(input_vector.reshape(1, -1), reference_vectors)[0]
        
        # 3. Hybrid Score
        results = []
        for i in range(len(reference_data)):
            dist = dists[i]
            cos = cosines[i]
            
            # Hybrid Calculation
            dist_sim = np.exp(-0.5 * dist)
            score = (dist_sim * 0.4) + (cos * 0.6)
            
            # Clamp to 55-98%
            min_s, max_s = 0.55, 0.98
            final_similarity = min_s + (score * (max_s - min_s))
            final_similarity = round(final_similarity * 100)
            
            if final_similarity < 99: # Exclude identical
                results.append({
                    "id": reference_data[i]["id"],
                    "participant_id": reference_data[i]["participant_id"],
                    "activity_type": reference_data[i]["activity_type"],
                    "similarity": int(final_similarity),
                    "original": reference_data[i]
                })
        
        return sorted(results, key=lambda x: x['similarity'], reverse=True)[:k]
