const { pool } = require('/opt/db'); // from DB layer (db.js in /opt)

exports.handler = async (event) => {
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  const date = event.pathParameters?.date;
  const daysParam = event.queryStringParameters?.days;

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

  const days = parseInt(daysParam, 10);
  if (isNaN(days) || days <= 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid or missing "days" query parameter. Must be a positive number.' }),
    };
  }

  try {
    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + days);

    const formattedEndDate = endDate.toISOString().split('T')[0];

    const result = await pool.query(
      'SELECT * FROM tasks WHERE user_id = $1 AND task_start_date BETWEEN $2 AND $3',
      [userId, date, formattedEndDate]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Tasks from ${date} to ${formattedEndDate} retrieved successfully`,
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
