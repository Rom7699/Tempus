const { pool } = require('/opt/db'); // from DB layer (db.js in /opt)

exports.handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorized User' }),
      };
    }

    const body = JSON.parse(event.body);
    const { list_name, list_icon, list_color } = body;

    if (!list_name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing 'list_name'" })
      };
    }

    const query = `
      INSERT INTO lists (list_name, list_icon, list_color, user_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const result = await pool.query(query, [list_name, list_icon || null, list_color || null, userId]);

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'List created successfully',
        list: result.rows[0],
      })
    };
  } catch (error) {
    console.error('Error inserting list:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' })
    };
  }
};
