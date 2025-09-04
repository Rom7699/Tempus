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

    const goalId = event.pathParameters?.goalId;

    if (!goalId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'goalId is required' }),
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

    // Use transaction to ensure consistency
    await client.query('BEGIN');

    // First, unlink any tasks associated with this goal
    await client.query(
      `UPDATE tasks 
       SET task_goal_id = NULL 
       WHERE user_id = $1 AND task_goal_id = $2`,
      [userId, parsedGoalId]
    );

    // Then delete the goal
    const deleteResult = await client.query(
      `DELETE FROM goals 
       WHERE user_id = $1 AND goal_id = $2 
       RETURNING *`,
      [userId, parsedGoalId]
    );

    if (deleteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Goal not found' }),
      };
    }

    await client.query('COMMIT');

    console.log("Goal deleted:", deleteResult.rows[0]);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Goal deleted successfully',
        deletedGoal: deleteResult.rows[0]
      }),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting goal:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error: error.message }),
    };
  } finally {
    client.release();
  }
};