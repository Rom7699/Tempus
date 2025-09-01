const { getPool } = require('/opt/nodejs/db'); // assumes db.js layer is in /opt

exports.handler = async (event) => {
  try {
    const pool = getPool();
    
    // Extract user ID from Cognito JWT claims
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    const date = event.pathParameters?.date;

    if (!userId || !date) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing user ID or date' }),
      };
    }

    // Query tasks for the given date and user
    const result = await pool.query(
      'SELECT * FROM tasks WHERE user_id = $1 AND task_start_date = $2',
      [userId, date]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Tasks fetched',
        tasksArr: result.rows,
      }),
    };
  } catch (error) {
    console.error('Error in getTasksByDay:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
