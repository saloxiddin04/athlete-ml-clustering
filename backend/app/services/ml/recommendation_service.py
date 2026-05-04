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
        confidence = round((agreement[winner] / k) * 100)
        
        return {
            "activity": winner,
            "confidence": max(55, min(95, confidence)),
            "neighbor_agreement": agreement[winner]
        }
