const { getPool } = require('/opt/nodejs/db'); // from DB layer (db.js in /opt)

exports.handler = async (event) => {
  try {
    const pool = getPool();
    
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    const taskId = event.pathParameters?.taskId;

    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorized User' }),
      };
    }

    if (!taskId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'taskId is required' }),
      };
    }

    const result = await pool.query(
      `DELETE FROM tasks WHERE user_id = $1 AND task_id = $2`,
      [userId, taskId]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Task deleted successfully' }),
    };
  } catch (error) {
    console.error('Error deleting task:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error: error.message }),
    };
  }
};
