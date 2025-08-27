const { pool } = require('/opt/db');

exports.handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    const listId = event.pathParameters?.listId;

    if (!userId || !listId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing user ID or list ID' }),
      };
    }

    const result = await pool.query(
      'SELECT * FROM lists WHERE list_id = $1 AND user_id = $2',
      [listId, userId]
    );

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'List not found' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'List fetched successfully',
        list: result.rows[0],
      }),
    };
  } catch (error) {
    console.error('Error fetching list by ID:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
