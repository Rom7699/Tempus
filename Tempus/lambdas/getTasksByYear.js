const { getPool } = require('/opt/nodejs/db'); // from Lambda layer (db.js in /opt)

exports.handler = async (event) => {
  console.log("Event received:", JSON.stringify(event));

  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  const year = event.pathParameters?.year;

  if (!userId) {
    console.warn("Unauthorized access attempt");
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Unauthorized User' }),
    };
  }

  if (!year) {
    console.warn("Year path parameter missing");
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing year in path' }),
    };
  }

  if (!/^\d{4}$/.test(year)) {
    console.warn("Invalid year format:", year);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid year format' }),
    };
  }

  try {
    const pool = getPool();
    
    const result = await pool.query(
      `SELECT * FROM tasks 
       WHERE user_id = $1 AND 
             EXTRACT(YEAR FROM task_start_date::date) = $2`,
      [userId, parseInt(year)]
    );

    console.log(`Retrieved ${result.rows.length} tasks for year ${year}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Tasks fetched successfully',
        tasksArr: result.rows,
      }),
    };
  } catch (err) {
    console.error("DB Query Failed:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error',
        error: err.message,
      }),
    };
  }
};
