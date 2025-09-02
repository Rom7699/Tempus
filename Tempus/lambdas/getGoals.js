const { getPool } = require('/opt/nodejs/db');
const { checkAndResetGoalCycle } = require('/opt/nodejs/checkGoalCycle');

exports.handler = async (event) => {
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  
  console.log("Extracted userId:", userId);

  // Auth check
  if (!userId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Unauthorized User' }),
    };
  }

  try {
    const pool = getPool();
    
    // Get query parameters for filtering
    const queryParams = event.queryStringParameters || {};
    const { goal_type, is_completed } = queryParams;

    let query = `SELECT * FROM goals WHERE user_id = $1`;
    const values = [userId];
    let paramIndex = 2;

    // Add filters if provided
    if (goal_type && ['daily', 'weekly', 'monthly'].includes(goal_type)) {
      query += ` AND goal_type = $${paramIndex}`;
      values.push(goal_type);
      paramIndex++;
    }

    if (is_completed !== undefined) {
      query += ` AND is_completed = $${paramIndex}`;
      values.push(is_completed === 'true');
      paramIndex++;
    }

    // Order by creation date (newest first)
    query += ` ORDER BY created_at DESC`;

    console.log("Query:", query);
    console.log("Values:", values);

    const result = await pool.query(query, values);

    // Add debug logging to understand the data format
    if (result.rows.length > 0) {
      console.log("Sample goal_selected_days from DB:", {
        type: typeof result.rows[0].goal_selected_days,
        value: result.rows[0].goal_selected_days,
        isArray: Array.isArray(result.rows[0].goal_selected_days)
      });
    }

    // Safe array conversion function
    const ensureArray = (value) => {
      if (value === null || value === undefined) return null;
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        // Handle PostgreSQL array format {1,2,3,4,5}
        if (value.startsWith('{') && value.endsWith('}')) {
          return value.slice(1, -1).split(',').map(Number);
        }
        // Handle JSON string format [1,2,3,4,5]
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      }
      return null;
    };

    // Process goal data to ensure arrays are properly formatted
    let processedGoals = result.rows.map(goal => ({
      ...goal,
      goal_selected_days: ensureArray(goal.goal_selected_days)
    }));

    // Check and reset cycles for all goals
    processedGoals = await Promise.all(
      processedGoals.map(goal => checkAndResetGoalCycle(pool, goal))
    );

    console.log("Query result:", processedGoals.length, "goals found");
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Goals fetched successfully',
        goals: processedGoals,
      }),
    };
  } catch (err) {
    console.error("DB Query Failed:", err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Internal server error',
        error: err.message,
      }),
    };
  }
};