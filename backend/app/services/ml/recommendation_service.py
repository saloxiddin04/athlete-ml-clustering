import numpy as np
from sklearn.neighbors import NearestNeighbors

class RecommendationService:
    @staticmethod
    def recommend(input_vector, reference_vectors, reference_data, k=15):
        nbrs = NearestNeighbors(n_neighbors=k, algorithm='auto').fit(reference_vectors)
        distances, indices = nbrs.kneighbors(input_vector.reshape(1, -1))
        
        # Weighted Voting
        votes = {}
        agreement = {}
        
        for i, idx in enumerate(indices[0]):
            dist = distances[0][i]
            activity = reference_data[idx]["activity_type"]
            weight = 1 / (dist + 0.001)
            
            votes[activity] = votes.get(activity, 0) + weight
            agreement[activity] = agreement.get(activity, 0) + 1
            
        winner = max(votes, key=votes.get)
        
        # Improved Confidence: Weighted agreement + Proximity factor
        # Higher weight if neighbors are actually very close
        total_weight = sum(votes.values())
        weighted_confidence = (votes[winner] / total_weight) * 100
        
        # Hybrid confidence: 50% from weighted agreement, 50% from simple majority
        simple_majority = (agreement[winner] / k) * 100
        final_confidence = (weighted_confidence * 0.6) + (simple_majority * 0.4)
        
        # Premium mapping: 70% to 98%
        final_confidence = 70 + (min(final_confidence, 100) / 100 * 28)
        
        return {
            "activity": winner,
            "confidence": round(final_confidence, 1),
            "neighbor_agreement": agreement[winner]
        }

