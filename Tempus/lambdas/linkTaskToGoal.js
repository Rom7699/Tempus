const { getPool } = require('/opt/nodejs/db');

exports.handler = async (event) => {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorized User' }),
      };
    }

    const { taskId, goalId } = JSON.parse(event.body || '{}');

    if (!taskId || !goalId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'taskId and goalId are required' }),
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

    // Use transaction for consistency
    await client.query('BEGIN');

    // Verify both task and goal belong to the user
    const taskResult = await client.query(
      `SELECT task_id, is_completed FROM tasks 
       WHERE user_id = $1 AND task_id = $2`,
      [userId, taskId]
    );

    const goalResult = await client.query(
      `SELECT goal_id, goal_progress FROM goals 
       WHERE user_id = $1 AND goal_id = $2`,
      [userId, parsedGoalId]
    );

    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Task not found' }),
      };
    }

    if (goalResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Goal not found' }),
      };
    }

    const task = taskResult.rows[0];
    const goal = goalResult.rows[0];

    // Link the task to the goal
    await client.query(
      `UPDATE tasks 
       SET task_goal_id = $1 
       WHERE user_id = $2 AND task_id = $3`,
      [parsedGoalId, userId, taskId]
    );

    // If the task is already completed, increment goal progress
    if (task.is_completed) {
      await client.query(
        `UPDATE goals
         SET goal_progress = goal_progress + 1,
             updated_at = NOW()
         WHERE goal_id = $1 AND user_id = $2`,
        [parsedGoalId, userId]
      );
    }

    await client.query('COMMIT');

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Task linked to goal successfully',
        linkage: {
          task_id: taskId,
          goal_id: parsedGoalId,
          progress_updated: task.is_completed
        }
      }),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error linking task to goal:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error: error.message }),
    };
  } finally {
    client.release();
  }
};