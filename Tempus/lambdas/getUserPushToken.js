const { getPool } = require('/opt/nodejs/db');

exports.handler = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));
    
    const userId = event.pathParameters?.userId;
    const tokenType = event.queryStringParameters?.tokenType || 'expo';

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'userId is required in path parameters' }),
      };
    }

    console.log(`Getting push token for user ${userId}, type: ${tokenType}`);

    const pool = getPool();
    
    const query = `
      SELECT push_token, token_type, created_at, updated_at 
      FROM user_push_tokens 
      WHERE user_id = $1 AND token_type = $2
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [userId, tokenType]);

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          message: 'No push token found for user',
          userId,
          tokenType 
        }),
      };
    }

    console.log('Push token retrieved successfully');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Push token retrieved successfully',
        tokenInfo: result.rows[0]
      }),
    };

  } catch (error) {
    console.error('Error getting push token:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Internal server error', 
        error: error.message 
      }),
    };
  }
};