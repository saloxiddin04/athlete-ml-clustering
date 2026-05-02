const { query } = require('../db');

/**
 * GET /athletes (Paginated list)
 */
const getAthletes = async (req, res) => {
  try {
    const { trained, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = [];
    const params = [];

    if (trained !== undefined) {
      params.push(trained === 'true');
      whereClause.push(`trained = $${params.length}`);
    }

    const where = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) FROM participants ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit), parseInt(offset));
    const result = await query(
      `SELECT * FROM participants
       ${where}
       ORDER BY id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      success: true,
      athletes: result.rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /athletes/stats
 * Quick summary stats for Redux badges and overview
 */
const getStats = async (req, res) => {
  try {
    const totalResult = await query('SELECT COUNT(*) FROM participants');
    const total = parseInt(totalResult.rows[0].count);
    
    // Simple clustering/trained summary
    const trainedResult = await query('SELECT COUNT(*) FROM participants WHERE trained = true');
    const trained = parseInt(trainedResult.rows[0].count);

    res.json({
      success: true,
      stats: {
        total,
        trained,
        untrained: total - trained,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /analytics
 * High-performance dashboard engine
 */
const getAnalytics = async (req, res) => {
  try {
    const { gender, activity_type, health_condition, age_min, age_max, date_start, date_end } = req.query;
    
    let whereClause = [];
    const params = [];

    if (gender) { params.push(gender); whereClause.push(`gender ILIKE $${params.length}`); }
    if (activity_type) { params.push(activity_type); whereClause.push(`activity_type ILIKE $${params.length}`); }
    if (health_condition) { params.push(health_condition); whereClause.push(`health_condition ILIKE $${params.length}`); }
    if (age_min) { params.push(parseFloat(age_min)); whereClause.push(`age >= $${params.length}`); }
    if (age_max) { params.push(parseFloat(age_max)); whereClause.push(`age <= $${params.length}`); }
    if (date_start) { params.push(date_start); whereClause.push(`recorded_at >= $${params.length}`); }
    if (date_end) { params.push(date_end); whereClause.push(`recorded_at <= $${params.length}`); }

    const where = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    const kpiResult = await query(`
      SELECT 
        COUNT(*) as total_participants,
        AVG(bmi)::float as avg_bmi,
        AVG(daily_steps)::float as avg_steps,
        AVG(calories_burned)::float as avg_calories,
        AVG(sleep_hours)::float as avg_sleep,
        AVG(avg_heart_rate)::float as avg_heart_rate,
        MIN(fitness_level::float)::float as min_fitness,
        MAX(fitness_level::float)::float as max_fitness
      FROM participants ${where}
    `, params);

    const activityResult = await query(`
      SELECT activity_type as name, COUNT(*) as value, AVG(calories_burned)::float as calories
      FROM participants ${where}
      GROUP BY activity_type
    `, params);

    const riskResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE bmi > 30) as high_bmi,
        COUNT(*) FILTER (WHERE systolic_bp > 140 OR diastolic_bp > 90) as high_bp,
        COUNT(*) FILTER (WHERE daily_steps < 3000) as low_activity
      FROM participants ${where}
    `, params);

    res.json({
        success: true,
        data: {
          kpis: kpiResult.rows[0],
          activity: activityResult.rows,
          risks: riskResult.rows[0]
        }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getFitnessStats = async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                cluster_id, 
                COUNT(*) as count, 
                AVG(bmi)::float as avg_bmi, 
                AVG(avg_heart_rate)::float as avg_heart_rate,
                AVG(fitness_level::float)::float as avg_fitness,
                'Cluster ' || cluster_id as fitness_level
            FROM participants 
            WHERE cluster_id IS NOT NULL
            GROUP BY cluster_id
            ORDER BY cluster_id
        `);
        const points = await query(`
            SELECT id, participant_id, fitness_level, pca_x, pca_y, cluster_id, age, bmi, calories_burned, activity_type 
            FROM participants 
            WHERE pca_x IS NOT NULL 
            LIMIT 2000
        `);
        res.json({ success: true, groups: result.rows, points: points.rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const deleteAthlete = async (req, res) => {
    await query(`DELETE FROM participants WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
};

const resetAthletes = async (req, res) => {
    await query(`DELETE FROM participants`);
    await query(`DELETE FROM uploads`);
    res.json({ success: true });
};

module.exports = { 
    getAthletes, 
    getStats, 
    getAnalytics, 
    getFitnessStats, 
    getClusters: getFitnessStats, 
    deleteAthlete, 
    resetAthletes 
};
