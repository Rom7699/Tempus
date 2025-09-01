const { getPool } = require('/opt/nodejs/db');

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
    const pool = getPool();
    
    // First verify the goal exists and belongs to the user
    const goalCheck = await pool.query(
      `SELECT goal_id FROM goals 
       WHERE user_id = $1 AND goal_id = $2`,
      [userId, parsedGoalId]
    );

    if (goalCheck.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Goal not found or not accessible' }),
      };
    }

    // Get tasks linked to this goal
    const result = await pool.query(
      `SELECT t.* FROM tasks t
       WHERE t.user_id = $1 AND t.task_goal_id = $2
       ORDER BY t.task_start_date DESC`,
      [userId, parsedGoalId]
    );

    console.log(`Found ${result.rows.length} tasks for goal ${parsedGoalId}`);

    // Process tasks to ensure proper data formatting
    const processedTasks = result.rows.map(task => ({
      ...task,
      // Ensure dates are in proper format
      task_start_date: task.task_start_date ? task.task_start_date.toISOString() : null,
      task_end_date: task.task_end_date ? task.task_end_date.toISOString() : null,
      created_at: task.created_at ? task.created_at.toISOString() : null,
      updated_at: task.updated_at ? task.updated_at.toISOString() : null,
      // Ensure boolean fields are proper booleans
      is_completed: Boolean(task.is_completed),
      is_recurring: Boolean(task.is_recurring),
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Tasks fetched successfully',
        tasksArr: processedTasks,
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