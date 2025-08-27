const { pool } = require('/opt/db'); // from DB layer (db.js in /opt)

exports.handler = async (event) => {
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  const year = event.pathParameters?.year;
  const month = event.pathParameters?.month;

  console.log("Extracted userId:", userId);
  console.log("Year:", year, "Month:", month);

  if (!userId) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Unauthorized User' }),
    };
  }

  if (!year || !month) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Missing year or month in path' }),
    };
  }

  if (!/^\d{4}$/.test(year) || !/^(0?[1-9]|1[0-2])$/.test(month)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Invalid year or month format' }),
    };
  }

  try {
    const result = await pool.query(
      `SELECT * FROM tasks 
       WHERE user_id = $1 AND 
             EXTRACT(YEAR FROM task_start_date::date) = $2 AND 
             EXTRACT(MONTH FROM task_start_date::date) = $3`,
      [userId, parseInt(year), parseInt(month)]
    );

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
