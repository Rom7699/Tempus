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
    
    // Get goal details with progress
    const goalResult = await pool.query(
      `SELECT 
        goal_id, goal_name, goal_type, goal_target, goal_progress, 
        goal_start_date, goal_end_date, goal_cycle_duration, goal_selected_days,
        is_completed, created_at
       FROM goals 
       WHERE user_id = $1 AND goal_id = $2`,
      [userId, parsedGoalId]
    );

    if (goalResult.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Goal not found' }),
      };
    }

    const goal = goalResult.rows[0];
    
    // Get associated tasks for this goal
    const tasksResult = await pool.query(
      `SELECT 
        task_id, task_name, task_start_date, is_completed
       FROM tasks 
       WHERE user_id = $1 AND task_goal_id = $2
       ORDER BY task_start_date DESC`,
      [userId, parsedGoalId]
    );

    // Calculate additional progress metrics
    const totalTasks = tasksResult.rows.length;
    const completedTasks = tasksResult.rows.filter(task => task.is_completed).length;
    const progressPercentage = goal.goal_target > 0 ? 
      Math.round((goal.goal_progress / goal.goal_target) * 100) : 0;

    // Check if goal is overdue
    let isOverdue = false;
    let daysRemaining = null;
    
    if (goal.goal_end_date && !goal.is_completed) {
      const endDate = new Date(goal.goal_end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      isOverdue = today > endDate;
      daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
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
      ...goal,
      goal_selected_days: ensureArray(goal.goal_selected_days)
    };

    const progressData = {
      goal: processedGoal,
      progress: {
        current: goal.goal_progress,
        target: goal.goal_target,
        percentage: progressPercentage,
        completed_tasks: completedTasks,
        total_linked_tasks: totalTasks,
        is_overdue: isOverdue,
        days_remaining: daysRemaining
      },
      tasks: tasksResult.rows
    };

    console.log("Progress data:", progressData);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Goal progress fetched successfully',
        data: progressData,
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