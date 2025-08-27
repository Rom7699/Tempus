const { pool } = require('/opt/db');

exports.handler = async (event) => {
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  const listId = event.pathParameters?.listId;

  console.log("Extracted userId:", userId);
  console.log("ListId:", listId);

  // Auth check
  if (!userId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Unauthorized User' }),
    };
  }

  // Path parameter validation
  if (!listId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing listId in path' }),
    };
  }

  try {
    const result = await pool.query(
      `SELECT * FROM tasks 
     WHERE user_id = $1 AND task_list_id = $2`,
      [userId, listId]
    );

    console.log("Query result:", result.rows);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Tasks fetched successfully',
        tasksArr: result.rows,
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