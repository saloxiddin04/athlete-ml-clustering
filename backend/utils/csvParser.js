// const { parse } = require('csv-parse');
// const fs = require('fs');
//
// const HEADER_MAP = {
//   'participant_id': ['participant_id', 'participant_id', 'id'],
//   'recorded_at': ['date', 'recorded_at', 'timestamp'],
//   'age': ['age'],
//   'gender': ['gender', 'sex'],
//   'height_cm': ['height_cm', 'height'],
//   'weight_kg': ['weight_kg', 'weight'],
//   'bmi': ['bmi'],
//   'activity_type': ['activity_type', 'activity'],
//   'duration_minutes': ['duration_minutes', 'duration_n', 'duration'],
//   'intensity': ['intensity'],
//   'calories_burned': ['calories_burned', 'calories_b'],
//   'daily_steps': ['daily_steps', 'daily_step'],
//   'avg_heart_rate': ['avg_heart_rate', 'avg_heart_'],
//   'resting_heart_rate': ['resting_heart_rate', 'resting_he'],
//   'systolic_bp': ['systolic_bp', 'blood_pressure: systolic', 'blood_pres', 'systolic'],
//   'diastolic_bp': ['diastolic_bp', 'blood_pressure: diastolic', 'blood_pres', 'diastolic'],
//   'endurance_level': ['endurance_level', 'endurance_score', 'endurance'],
//   'sleep_hours': ['sleep_hours', 'sleep_hou', 'sleep'],
//   'stress_level': ['stress_level', 'stress_leve'],
//   'hydration_level': ['hydration_level', 'hydration_'],
//   'smoke_status': ['smoke_status', 'smoking_status', 'smoking_s'],
//   'fitness_level': ['fitness_level', 'fitness_le'],
//   'trained': ['trained']
// };
//
// /**
//  * Memory-safe async CSV to DB stream
//  */
// const streamCSV = async (filePath, onRow) => {
//   let totalProcessed = 0;
//   let errorsCount = 0;
//   let fieldMapping = null;
//
//   const parser = fs.createReadStream(filePath).pipe(
//     parse({
//       columns: true,
//       skip_empty_lines: true,
//       trim: true,
//       relax_column_count: true // In case some lines have extra commas
//     })
//   );
//
//   for await (const record of parser) {
//     if (!fieldMapping) {
//       fieldMapping = {};
//       const actualHeaders = Object.keys(record).map(h => h.trim().toLowerCase());
//
//       Object.entries(HEADER_MAP).forEach(([target, aliases]) => {
//         // Try exact match first, then partial match for truncated columns
//         const found = Object.keys(record).find(h => {
//           const lowerH = h.trim().toLowerCase();
//           return aliases.some(a => lowerH.startsWith(a.toLowerCase()));
//         });
//         if (found) fieldMapping[target] = found;
//       });
//       console.log('Final Pro-Mapping Detected:', fieldMapping);
//     }
//
//     const parsedRow = {};
//     let isValid = true;
//
//     // Extract fields
//     Object.entries(fieldMapping).forEach(([targetField, csvKey]) => {
//       const rawVal = record[csvKey];
//
//       if (['age', 'height_cm', 'weight_kg', 'bmi', 'duration_minutes', 'calories_burned', 'daily_steps', 'avg_heart_rate', 'resting_heart_rate', 'systolic_bp', 'diastolic_bp', 'endurance_level', 'sleep_hours', 'stress_level', 'hydration_level'].includes(targetField)) {
//         const num = parseFloat(rawVal);
//         parsedRow[targetField] = isNaN(num) ? 0 : num;
//       } else if (targetField === 'fitness_level') {
//         // Handle numerical fitness level from screenshot
//         parsedRow[targetField] = (rawVal || 'Normal').toString();
//       } else {
//         parsedRow[targetField] = (rawVal || '').toString().trim();
//       }
//     });
//
//     // Handle missing 'trained' field (not in screenshot)
//     parsedRow.trained = (record['trained']?.toLowerCase() === 'true' || record['trained'] === '1');
//     parsedRow.health_condition = record['health_condition'] || record['health_cor'] || 'None';
//
//     // Simplified validation: if we have a participant_id and age, it's likely a real row
//     if (parsedRow.participant_id && !isNaN(parsedRow.age)) {
//       totalProcessed++;
//       await onRow(parsedRow);
//     } else {
//       errorsCount++;
//     }
//   }
//
//   return { totalRows: totalProcessed, errors: errorsCount };
// };
//
// const generateSampleCSV = () => '';
//
// module.exports = { streamCSV, generateSampleCSV };


const { parse } = require('csv-parse');
const fs = require('fs');

const HEADER_MAP = {
  'participant_id': ['participant_id', 'participant_id', 'id'],
  'recorded_at': ['date', 'recorded_at', 'timestamp'],
  'age': ['age'],
  'gender': ['gender', 'sex'],
  'height_cm': ['height_cm', 'height'],
  'weight_kg': ['weight_kg', 'weight'],
  'bmi': ['bmi'],
  'activity_type': ['activity_type', 'activity'],
  'duration_minutes': ['duration_minutes', 'duration_n', 'duration'],
  'intensity': ['intensity'],
  'calories_burned': ['calories_burned', 'calories_b'],
  'daily_steps': ['daily_steps', 'daily_step'],
  'avg_heart_rate': ['avg_heart_rate', 'avg_heart_'],
  'resting_heart_rate': ['resting_heart_rate', 'resting_he'],
  'systolic_bp': ['systolic_bp', 'blood_pressure: systolic', 'blood_pres', 'systolic'],
  'diastolic_bp': ['diastolic_bp', 'blood_pressure: diastolic', 'blood_pres', 'diastolic'],
  'endurance_level': ['endurance_level', 'endurance_score', 'endurance'],
  'sleep_hours': ['sleep_hours', 'sleep_hou', 'sleep'],
  'stress_level': ['stress_level', 'stress_leve'],
  'hydration_level': ['hydration_level', 'hydration_'],
  'smoke_status': ['smoke_status', 'smoking_status', 'smoking_s'],
  'fitness_level': ['fitness_level', 'fitness_le'],
  'trained': ['trained']
};

/**
 * Convert date from DD/MM/YYYY to YYYY-MM-DD
 */
function convertDateToPostgresFormat(dateStr) {
  if (!dateStr || dateStr === '') return null;

  // If already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Handle DD/MM/YYYY format
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      // parts[0] = day, parts[1] = month, parts[2] = year
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  // Handle DD-MM-YYYY format
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length <= 2) {
      // DD-MM-YYYY
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  // Try to parse with Date object as fallback
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  console.warn(`Could not parse date: ${dateStr}`);
  return null;
}

/**
 * Memory-safe async CSV to DB stream
 */
const streamCSV = async (filePath, onRow) => {
  let totalProcessed = 0;
  let errorsCount = 0;
  let fieldMapping = null;

  const parser = fs.createReadStream(filePath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    })
  );

  for await (const record of parser) {
    if (!fieldMapping) {
      fieldMapping = {};
      const actualHeaders = Object.keys(record).map(h => h.trim().toLowerCase());

      Object.entries(HEADER_MAP).forEach(([target, aliases]) => {
        const found = Object.keys(record).find(h => {
          const lowerH = h.trim().toLowerCase();
          return aliases.some(a => lowerH.startsWith(a.toLowerCase()));
        });
        if (found) fieldMapping[target] = found;
      });
      console.log('Field Mapping Detected:', fieldMapping);
    }

    const parsedRow = {};

    // Extract and convert fields
    Object.entries(fieldMapping).forEach(([targetField, csvKey]) => {
      const rawVal = record[csvKey];

      if (['age', 'height_cm', 'weight_kg', 'bmi', 'duration_minutes', 'calories_burned', 'daily_steps', 'avg_heart_rate', 'resting_heart_rate', 'systolic_bp', 'diastolic_bp', 'endurance_level', 'sleep_hours', 'stress_level', 'hydration_level'].includes(targetField)) {
        const num = parseFloat(rawVal);
        parsedRow[targetField] = isNaN(num) ? 0 : num;
      } else if (targetField === 'recorded_at') {
        // Convert date format
        parsedRow[targetField] = convertDateToPostgresFormat(rawVal);
      } else if (targetField === 'fitness_level') {
        parsedRow[targetField] = (rawVal || 'Normal').toString();
      } else {
        parsedRow[targetField] = (rawVal || '').toString().trim();
      }
    });

    // Handle missing fields
    parsedRow.trained = (record['trained']?.toLowerCase() === 'true' || record['trained'] === '1');
    parsedRow.health_condition = record['health_condition'] || record['health_cor'] || 'None';

    // Validate required fields
    if (parsedRow.participant_id && parsedRow.age !== undefined && parsedRow.recorded_at) {
      totalProcessed++;
      await onRow(parsedRow);
    } else {
      errorsCount++;
      if (errorsCount <= 5) {
        console.warn('Skipping invalid row:', {
          participant_id: parsedRow.participant_id,
          age: parsedRow.age,
          recorded_at: parsedRow.recorded_at
        });
      }
    }
  }

  return { totalRows: totalProcessed, errors: errorsCount };
};

module.exports = { streamCSV, generateSampleCSV: () => '' };