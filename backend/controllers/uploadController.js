const path = require('path');
const fs = require('fs');
const { query } = require('../db');
const { streamCSV, generateSampleCSV } = require('../utils/csvParser');

/**
 * POST /upload-csv
 * Optimized streaming upload for large datasets (81MB+)
 */
const uploadCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  const filePath = req.file.path;

  try {
    // 1. Create upload record first
    const uploadResult = await query(
      `INSERT INTO uploads (filename, original_name, row_count) VALUES ($1, $2, 0) RETURNING *`,
      [req.file.filename, req.file.originalname]
    );
    const upload = uploadResult.rows[0];

    // 2. Stream and Insert simultaneously
    let insertedCount = 0;
    
    // Define the insertion handler
    const onRowHandler = async (row) => {
      await query(
        `INSERT INTO participants (
          participant_id, recorded_at, age, gender, height_cm, weight_kg, bmi, 
          activity_type, duration_minutes, intensity, calories_burned, 
          daily_steps, avg_heart_rate, resting_heart_rate, systolic_bp, 
          diastolic_bp, endurance_level, sleep_hours, stress_level, 
          hydration_level, smoke_status, health_condition, fitness_level, 
          trained, source
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, 'from_csv')`,
        [
          row.participant_id, row.recorded_at, row.age, row.gender, row.height_cm, row.weight_kg, row.bmi,
          row.activity_type, row.duration_minutes, row.intensity, row.calories_burned,
          row.daily_steps, row.avg_heart_rate, row.resting_heart_rate, row.systolic_bp,
          row.diastolic_bp, row.endurance_level, row.sleep_hours, row.stress_level,
          row.hydration_level, row.smoke_status, row.health_condition, row.fitness_level,
          true
        ]
      );
      insertedCount++;
    };

    // Run the stream
    const results = await streamCSV(filePath, onRowHandler);

    // 3. Update the upload record with final count
    await query(`UPDATE uploads SET row_count = $1 WHERE id = $2`, [insertedCount, upload.id]);

    // Clean up uploaded file
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: `Successfully processed ${insertedCount} participants from ${req.file.originalname}`,
      inserted: insertedCount,
      skipped: results.errors
    });

  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error('Streaming Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getUploads = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.*, (SELECT COUNT(id) FROM participants) as participant_count 
       FROM uploads u
       ORDER BY u.uploaded_at DESC`
    );
    res.json({ success: true, uploads: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getSampleCSV = (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sample_health.csv"');
  res.send('participant_id,age,gender,height_cm,weight_kg,bmi,activity_type,duration_minutes,intensity,calories_burned,daily_steps,avg_heart_rate,resting_heart_rate,systolic_bp,diastolic_bp,endurance_level,sleep_hours,stress_level,hydration_level,smoke_status,health_condition,fitness_level,trained\nP001,25,male,180,75,23.1,running,45,high,500,10000,145,65,120,80,15,8,3,2.5,never,,high,true');
};

module.exports = { uploadCSV, getUploads, getSampleCSV };
