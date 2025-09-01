const { getPool } = require('/opt/nodejs/db'); // from DB layer (db.js in /opt)
// Format of date: YYYY-MM-DD

exports.handler = async (event) => {
  const userId = event.requestContext?.authorizer?.jwt?.claims?.email;
  const date = event.pathParameters?.date;

  if (!userId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Unauthorized User' }),
    };
  }

  if (!date) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing date in path' }),
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid date format. Use YYYY-MM-DD.' }),
    };
  }

  try {
    const pool = getPool();
    
    const result = await pool.query(
      'SELECT * FROM tasks WHERE user_id = $1 AND task_start_date = $2',
      [userId, date]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Tasks retrieved successfully',
        tasksArr: result.rows
      }),
    };
  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error: err.message }),
    };
  }
};
