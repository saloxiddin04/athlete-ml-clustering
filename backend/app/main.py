import os
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import pandas as pd
import io
from app.db.session import get_db
from app.services.ml.training_service import MLTrainingService
from app.services.ml.similarity_service import SimilarityService
from app.services.ml.recommendation_service import RecommendationService

from app.api.endpoints import auth

app = FastAPI(title="Athlete Fitness Analytics API (Python)", version="2.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])


# Global ML State
ml_pipeline = MLTrainingService()
cached_ref_vectors = None
cached_ref_data = None

@app.get("/api/health")
async def health():
    return {"status": "ok", "engine": "python-fastapi"}

@app.post("/api/upload-csv")
async def upload_csv(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))
    
    # Clean column names
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    
    # Bulk insert using SQLAlchemy core for performance
    records = df.to_dict(orient='records')
    for r in records:
        # Basic mapping/cleanup if needed
        if 'bmi' not in r and 'weight_kg' in r and 'height_cm' in r:
            h_m = float(r['height_cm']) / 100
            r['bmi'] = round(float(r['weight_kg']) / (h_m * h_m), 1)
        
        # Ensure 'trained' is false for new records
        r['trained'] = False
        r['source'] = 'upload'
    
    await db.execute(text("""
        INSERT INTO participants (
            participant_id, age, gender, height_cm, weight_kg, bmi, 
            activity_type, duration_minutes, intensity, calories_burned,
            daily_steps, avg_heart_rate, resting_heart_rate, systolic_bp, 
            diastolic_bp, endurance_level, sleep_hours, stress_level, 
            hydration_level, smoke_status, health_condition, trained, source
        ) VALUES (
            :participant_id, :age, :gender, :height_cm, :weight_kg, :bmi, 
            :activity_type, :duration_minutes, :intensity, :calories_burned,
            :daily_steps, :avg_heart_rate, :resting_heart_rate, :systolic_bp, 
            :diastolic_bp, :endurance_level, :sleep_hours, :stress_level, 
            :hydration_level, :smoke_status, :health_condition, :trained, :source
        )
    """), records)
    
    await db.commit()
    
    # Record the upload
    await db.execute(text("INSERT INTO uploads (filename, original_name, row_count) VALUES (:f, :o, :c)"),
                    {"f": file.filename, "o": file.filename, "c": len(records)})
    await db.commit()
    
    return {"success": True, "count": len(records)}


@app.post("/api/ml/train")
@app.post("/api/regression/train")
@app.post("/api/train")
async def train(db: AsyncSession = Depends(get_db)):
    result = await ml_pipeline.run_pipeline(db)
    # Refresh cache after training
    global cached_ref_vectors, cached_ref_data
    cached_ref_vectors = None
    return result

@app.get("/api/ml/dashboard")
async def ml_dashboard():
    return {
        "success": True,
        "metrics": ml_pipeline.metrics,
        "feature_importance": ml_pipeline.feature_importance,
        "best_model": ml_pipeline.best_model_name,
        "trained_on": len(ml_pipeline.feature_importance) # Just a placeholder count
    }

@app.get("/api/training-history")

async def training_history():
    return {
        "success": True, 
        "history": [{
            "accuracy": ml_pipeline.metrics.get("rf", {}).get("r2", 0),
            "total_records": 20000,
            "trained_at": "just now"
        }]
    }

@app.get("/api/clusters")
async def get_clusters(db: AsyncSession = Depends(get_db)):
    # Legacy dashboard needs clusters for visualization
    query = text("SELECT id, participant_id, fitness_level, pca_x, pca_y, cluster_id, age, bmi, calories_burned, activity_type FROM participants WHERE pca_x IS NOT NULL LIMIT 2000")
    res = await db.execute(query)
    points = [dict(r._mapping) for r in res.fetchall()]
    
    # Aggregated stats
    res_stats = await db.execute(text("SELECT cluster_id, COUNT(*) as count, AVG(bmi) as avg_bmi FROM participants WHERE cluster_id IS NOT NULL GROUP BY cluster_id"))
    groups = [dict(r._mapping) for r in res_stats.fetchall()]
    
    return {"success": True, "groups": groups, "points": points}


@app.post("/api/predict")
@app.post("/api/regression/predict")
async def predict_consolidated(payload: dict = Body(...), db: AsyncSession = Depends(get_db)):
    if ml_pipeline.preprocessor.pipeline is None:
        await ml_pipeline.run_pipeline(db)
        
    # 1. Regression Prediction
    model_type = payload.get("model", "best")
    calories = ml_pipeline.predict(payload, model_type)
    
    # 2. Similarity & Recommendation (Needs Reference Data)
    global cached_ref_vectors, cached_ref_data
    if cached_ref_vectors is None:
        query = text("""
            SELECT id, participant_id, age, gender, height_cm, weight_kg, bmi, 
                   activity_type, duration_minutes, intensity, calories_burned,
                   daily_steps, avg_heart_rate, resting_heart_rate,
                   systolic_bp, diastolic_bp, endurance_level, sleep_hours, 
                   stress_level, hydration_level, smoke_status, health_condition
            FROM participants 
            WHERE calories_burned IS NOT NULL
            LIMIT 5000
        """)
        res = await db.execute(query)
        rows = [dict(r._mapping) for r in res.fetchall()]
        df_ref = pd.DataFrame(rows)
        cached_ref_data = rows
        
        # Drop identifiers for transformation
        df_ref_features = df_ref.drop(columns=['id', 'participant_id', 'calories_burned'])
        cached_ref_vectors = ml_pipeline.preprocessor.transform(df_ref_features)
    
    # Transform input correctly
    df_input = pd.DataFrame([payload])
    input_vector = ml_pipeline.preprocessor.transform(df_input)[0]
    
    similar = SimilarityService.get_similar_athletes(
        input_vector, cached_ref_vectors, cached_ref_data, ml_pipeline.preprocessor.feature_names, k=3
    )
    
    recommendation = RecommendationService.recommend(
        input_vector, cached_ref_vectors, cached_ref_data, k=15
    )
    
    return {
        "success": True,
        "predicted_calories": round(calories, 1),
        "model_used": model_type,
        "similar_athletes": similar,
        "recommendation": {
            "activity_type": recommendation["activity"],
            "confidence": recommendation["confidence"],
            "duration_minutes": payload.get("duration_minutes", 45),
            "intensity": payload.get("intensity", "medium"),
            "health_tip": "Python engine suggests consistent hydration."
        },
        "metrics": ml_pipeline.metrics
    }

@app.get("/api/analytics")
async def get_analytics(db: AsyncSession = Depends(get_db)):
    # 1. KPIs
    res_kpis = await db.execute(text("""
        SELECT 
            COUNT(*) as total_participants,
            AVG(bmi) as avg_bmi,
            AVG(daily_steps) as avg_steps,
            AVG(calories_burned) as avg_calories,
            AVG(sleep_hours) as avg_sleep,
            AVG(avg_heart_rate) as avg_heart_rate,
            MIN(endurance_level) as min_fitness,
            MAX(endurance_level) as max_fitness
        FROM participants
    """))
    kpis = dict(res_kpis.fetchone()._mapping)
    
    # 2. Activity Distribution
    res_activity = await db.execute(text("""
        SELECT activity_type as name, AVG(calories_burned) as calories, COUNT(*) as value
        FROM participants
        GROUP BY activity_type
    """))
    activity = [dict(r._mapping) for r in res_activity.fetchall()]
    
    # 3. Risks
    res_risks = await db.execute(text("""
        SELECT 
            COUNT(*) FILTER (WHERE bmi > 30) as high_bmi,
            COUNT(*) FILTER (WHERE systolic_bp > 140) as high_bp,
            COUNT(*) FILTER (WHERE daily_steps < 3000) as low_activity
        FROM participants
    """))
    risks = dict(res_risks.fetchone()._mapping)
    
    return {
        "success": True,
        "data": {
            "kpis": kpis,
            "activity": activity,
            "risks": risks,
            "feature_importance": getattr(ml_pipeline, 'feature_importance', [])
        }
    }

@app.get("/api/athletes")
async def get_athletes(
    page: int = 1, 
    limit: int = 15, 
    search: str = "", 
    db: AsyncSession = Depends(get_db)
):
    offset = (page - 1) * limit
    
    # Base query
    query_str = "SELECT * FROM participants"
    count_str = "SELECT COUNT(*) FROM participants"
    params = {"limit": limit, "offset": offset}
    
    if search:
        query_str += " WHERE participant_id ILIKE :s OR activity_type ILIKE :s"
        count_str += " WHERE participant_id ILIKE :s OR activity_type ILIKE :s"
        params["s"] = f"%{search}%"
    
    query_str += " ORDER BY id DESC LIMIT :limit OFFSET :offset"
    
    res = await db.execute(text(query_str), params)
    athletes = [dict(r._mapping) for r in res.fetchall()]
    
    res_count = await db.execute(text(count_str), {"s": f"%{search}%"} if search else {})
    total = res_count.scalar()
    
    return {
        "success": True,
        "list": athletes,
        "pagination": {
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }
    }

@app.delete("/api/athletes/reset")
async def reset_athletes(db: AsyncSession = Depends(get_db)):
    await db.execute(text("DELETE FROM participants"))
    await db.execute(text("DELETE FROM uploads"))
    await db.commit()
    return {"success": True, "message": "All data reset"}

@app.delete("/api/athletes/{athlete_id}")
async def delete_athlete(athlete_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(text("DELETE FROM participants WHERE id = :id"), {"id": athlete_id})
    await db.commit()
    if res.rowcount == 0:
        raise HTTPException(status_code=404, detail="Athlete not found")
    return {"success": True, "message": f"Athlete {athlete_id} deleted"}

@app.get("/api/athletes/stats")



async def get_stats(db: AsyncSession = Depends(get_db)):
    res = await db.execute(text("SELECT COUNT(*) FROM participants"))
    total = res.scalar()
    res_trained = await db.execute(text("SELECT COUNT(*) FROM participants WHERE trained = true"))
    trained = res_trained.scalar()
    
    return {
        "success": True,
        "stats": {
            "total": total,
            "trained": trained,
            "untrained": total - trained,
            "lastUpdated": "just now (Python)"
        }
    }

@app.get("/api/regression/metrics")
@app.get("/api/ml/metrics")
async def get_metrics():
    return {"success": True, "metrics": ml_pipeline.metrics}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
