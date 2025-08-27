const { pool } = require('/opt/db');

exports.handler = async (event) => {
  const client = await pool.connect();
  try {
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorized User' }),
      };
    }

    const taskId = event.pathParameters?.taskId;

    if (!taskId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'taskId is required' }),
      };
    }

    // Use transaction for consistency
    await client.query('BEGIN');

    // Get current task details
    const taskResult = await client.query(
      `SELECT task_id, task_goal_id, is_completed FROM tasks 
       WHERE user_id = $1 AND task_id = $2`,
      [userId, taskId]
    );

    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Task not found' }),
      };
    }

    const task = taskResult.rows[0];

    if (!task.task_goal_id) {
      await client.query('ROLLBACK');
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Task is not linked to any goal' }),
      };
    }

    const previousGoalId = task.task_goal_id;

    // Unlink the task from the goal
    await client.query(
      `UPDATE tasks 
       SET task_goal_id = NULL 
       WHERE user_id = $1 AND task_id = $2`,
      [userId, taskId]
    );

    // If the task was completed, decrement goal progress
    if (task.is_completed) {
      await client.query(
        `UPDATE goals
         SET goal_progress = GREATEST(goal_progress - 1, 0),
             updated_at = NOW()
         WHERE goal_id = $1 AND user_id = $2`,
        [previousGoalId, userId]
      );
    }

    await client.query('COMMIT');

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Task unlinked from goal successfully',
        unlinkage: {
          task_id: taskId,
          previous_goal_id: previousGoalId,
          progress_updated: task.is_completed
        }
      }),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error unlinking task from goal:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error: error.message }),
    };
  } finally {
    client.release();
  }
};