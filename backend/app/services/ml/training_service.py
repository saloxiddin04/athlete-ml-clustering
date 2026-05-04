import os
import pandas as pd

import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import mean_squared_error, r2_score
from app.services.ml.preprocessing.preprocessor import DataPreprocessor
from sqlalchemy import text
import joblib
import time

class MLTrainingService:
    def __init__(self):
        self.preprocessor = DataPreprocessor()
        self.rf_model = None
        self.gbm_model = None
        self.kmeans = None
        self.pca = None
        self.metrics = {}
        self.feature_importance = []
        self.best_model_name = 'rf'
        
        # Robust path handling: find the 'backend/models' directory
        # This works whether running from root or from backend folder
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        self.models_dir = os.path.join(base_dir, "models")
        
        # Try to load existing models on init
        self.load_models()


    def save_models(self):
        import os
        if not os.path.exists(self.models_dir):
            os.makedirs(self.models_dir)
            
        joblib.dump(self.rf_model, f"{self.models_dir}/rf_model.pkl")
        joblib.dump(self.gbm_model, f"{self.models_dir}/gbm_model.pkl")
        joblib.dump(self.kmeans, f"{self.models_dir}/kmeans.pkl")
        joblib.dump(self.pca, f"{self.models_dir}/pca.pkl")
        joblib.dump(self.preprocessor, f"{self.models_dir}/preprocessor.pkl")
        joblib.dump({
            "metrics": self.metrics,
            "best_model": self.best_model_name,
            "feature_importance": self.feature_importance
        }, f"{self.models_dir}/metadata.pkl")
        print(f"💾 Models and metadata saved to {self.models_dir}")

    def load_models(self):
        import os
        try:
            if os.path.exists(f"{self.models_dir}/metadata.pkl"):
                self.rf_model = joblib.load(f"{self.models_dir}/rf_model.pkl")
                self.gbm_model = joblib.load(f"{self.models_dir}/gbm_model.pkl")
                self.kmeans = joblib.load(f"{self.models_dir}/kmeans.pkl")
                self.pca = joblib.load(f"{self.models_dir}/pca.pkl")
                self.preprocessor = joblib.load(f"{self.models_dir}/preprocessor.pkl")
                
                meta = joblib.load(f"{self.models_dir}/metadata.pkl")
                self.metrics = meta.get("metrics", {})
                self.best_model_name = meta.get("best_model", "rf")
                self.feature_importance = meta.get("feature_importance", [])
                print("🧠 Existing models loaded successfully")
        except Exception as e:
            print(f"⚠️ Could not load models: {e}")



    async def run_pipeline(self, db_session):
        start_time = time.time()
        
        # 1. Fetch Data
        query = text("""
            SELECT id, age, gender, height_cm, weight_kg, bmi, 
                   activity_type, duration_minutes, intensity, calories_burned,
                   daily_steps, avg_heart_rate, resting_heart_rate,
                   systolic_bp, diastolic_bp, endurance_level, sleep_hours, 
                   stress_level, hydration_level, smoke_status, health_condition
            FROM participants
            WHERE calories_burned IS NOT NULL
            ORDER BY id ASC
            LIMIT 50000
        """)
        result = await db_session.execute(query)
        df = pd.DataFrame(result.fetchall(), columns=result.keys())
        
        if len(df) < 100:
            return {"error": "Insufficient data"}

        # 2. Preprocessing
        numerical = ['age', 'height_cm', 'weight_kg', 'bmi', 'duration_minutes', 
                     'daily_steps', 'avg_heart_rate', 'resting_heart_rate',
                     'systolic_bp', 'diastolic_bp', 'endurance_level', 'sleep_hours', 
                     'stress_level', 'hydration_level']
        categorical = ['gender', 'activity_type', 'intensity', 'smoke_status', 'health_condition']
        
        X_raw = df.drop(columns=['calories_burned'])
        y = df['calories_burned'].astype(float)
        
        self.preprocessor.fit(X_raw, numerical, categorical)
        X_scaled = self.preprocessor.transform(X_raw)

        # 3. Regression Training (RF & GBM)
        from sklearn.model_selection import train_test_split
        X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
        
        # Random Forest - Increased complexity to capture high calorie peaks
        self.rf_model = RandomForestRegressor(
            n_estimators=200, 
            max_depth=25, 
            min_samples_split=2,
            random_state=42
        )
        self.rf_model.fit(X_train, y_train)
        rf_preds = self.rf_model.predict(X_test)

        rf_rmse = np.sqrt(mean_squared_error(y_test, rf_preds))
        rf_r2 = r2_score(y_test, rf_preds)
        
        # GBM
        self.gbm_model = GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42)
        self.gbm_model.fit(X_train, y_train)
        gbm_preds = self.gbm_model.predict(X_test)
        gbm_rmse = np.sqrt(mean_squared_error(y_test, gbm_preds))
        gbm_r2 = r2_score(y_test, gbm_preds)
        
        self.metrics = {
            "rf": {"rmse": float(rf_rmse), "r2": float(rf_r2)},
            "gbm": {"rmse": float(gbm_rmse), "r2": float(gbm_r2)}
        }
        self.best_model_name = 'rf' if rf_rmse < gbm_rmse else 'gbm'

        # 4. PCA & Clustering
        self.pca = PCA(n_components=10)
        X_pca = self.pca.fit_transform(X_scaled)
        
        self.kmeans = KMeans(n_clusters=5, random_state=42, n_init=10)
        self.kmeans.fit(X_pca)
        
        # 5. Feature Importance
        importances = self.rf_model.feature_importances_
        feature_names = self.preprocessor.feature_names
        self.feature_importance = sorted(
            [{"name": f, "value": round(float(i) * 100, 2)} for f, i in zip(feature_names, importances)],
            key=lambda x: x['value'], reverse=True
        )[:15]

        # 6. Save results back to DB
        # Assign PCA coordinates and clusters to the participants used for training
        df['pca_x'] = X_pca[:, 0]
        df['pca_y'] = X_pca[:, 1]
        df['cluster_id'] = self.kmeans.labels_
        
        # Batch Update
        update_data = df[['id', 'pca_x', 'pca_y', 'cluster_id']].to_dict(orient='records')
        update_query = text("""
            UPDATE participants 
            SET pca_x = :pca_x, pca_y = :pca_y, cluster_id = :cluster_id, trained = true 
            WHERE id = :id
        """)
        await db_session.execute(update_query, update_data)
        await db_session.commit()
        
        # Save models to disk
        self.save_models()
        
        duration = time.time() - start_time

        print(f"✅ Training Pipeline finished in {duration:.2f}s")
        
        return {
            "status": "success",
            "metrics": self.metrics,
            "feature_importance": self.feature_importance,
            "trained_on": len(df),
            "best_model": self.best_model_name,
            "duration_s": duration
        }


    def predict(self, profile, model_type='best'):
        df_input = pd.DataFrame([profile])
        X_input = self.preprocessor.transform(df_input)
        
        model = self.rf_model if (model_type == 'rf' or (model_type == 'best' and self.best_model_name == 'rf')) else self.gbm_model
        prediction = model.predict(X_input)[0]
        return float(prediction)

    def get_cluster(self, profile):
        df_input = pd.DataFrame([profile])
        X_input = self.preprocessor.transform(df_input)
        X_pca = self.pca.transform(X_input)
        cluster_id = self.kmeans.predict(X_pca)[0]
        
        labels = ["Recovery Focused", "Beginner", "Intermediate", "Endurance", "High Performance"]
        return {"cluster_id": int(cluster_id), "label": labels[cluster_id]}
