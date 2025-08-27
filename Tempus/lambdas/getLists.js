const { pool } = require('/opt/db'); // Reuse your DB connection layer

exports.handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorized User' }),
      };
    }
    console.log("JWT Claims:", event.requestContext?.authorizer?.jwt?.claims);

    const query = `
      SELECT list_id, list_name, list_icon, list_creation_date, list_color
      FROM lists
      WHERE user_id = $1
      ORDER BY list_creation_date DESC;
    `;

    const result = await pool.query(query, [userId]);
    console.log("Query result:", result.rows);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Lists fetched successfully',
        listsArr: result.rows,
      })
    };

  } catch (error) {
    console.error('Error fetching lists:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Internal Server Error!!' })
    };
  }
};
