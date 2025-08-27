const { pool } = require('/opt/db'); // from DB layer (db.js in /opt)

exports.handler = async (event) => {
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  const taskId = event.pathParameters?.taskId;

  if (!userId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Unauthorized User', data: null }),
    };
  }

  if (!taskId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing taskId in path', data: null }),
    };
  }

  const query = 'SELECT * FROM tasks WHERE task_id = $1 AND user_id = $2';
  const values = [taskId, userId];

  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Task not found', data: null }),
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Task retrieved successfully',
        task: result.rows[0]
      })
    };
  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error',
        error: err.message,
        data: null
      }),
    };
  }
};
