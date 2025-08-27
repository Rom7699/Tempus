const { pool } = require('/opt/db');

exports.handler = async (event) => {
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  const goalId = event.pathParameters?.goalId;

  console.log("Extracted userId:", userId);
  console.log("GoalId:", goalId);

  // Auth check
  if (!userId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Unauthorized User' }),
    };
  }

  // Path parameter validation
  if (!goalId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing goalId in path' }),
    };
  }

  // Parse goalId as integer
  const parsedGoalId = parseInt(goalId);
  if (isNaN(parsedGoalId)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'goalId must be a valid number' }),
    };
  }

  try {
    const result = await pool.query(
      `SELECT * FROM goals 
       WHERE user_id = $1 AND goal_id = $2`,
      [userId, parsedGoalId]
    );

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Goal not found' }),
      };
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
    const processedGoal = {
      ...result.rows[0],
      goal_selected_days: ensureArray(result.rows[0].goal_selected_days)
    };

    console.log("Query result:", processedGoal);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Goal fetched successfully',
        goal: processedGoal,
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