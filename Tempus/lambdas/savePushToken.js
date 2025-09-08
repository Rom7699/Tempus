const { getPool } = require('/opt/nodejs/db');

exports.handler = async (event) => {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));
    
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorized User' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { pushToken, tokenType = 'expo' } = body;

    if (!pushToken) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'pushToken is required' }),
      };
    }

    console.log(`Saving push token for user ${userId}: ${pushToken}`);

    await client.query('BEGIN');

    // Check if user already has a push token
    const existingTokenQuery = `
      SELECT id FROM user_push_tokens 
      WHERE user_id = $1 AND token_type = $2
    `;
    
    const existingResult = await client.query(existingTokenQuery, [userId, tokenType]);

    if (existingResult.rows.length > 0) {
      // Update existing token
      const updateQuery = `
        UPDATE user_push_tokens 
        SET push_token = $1, updated_at = NOW()
        WHERE user_id = $2 AND token_type = $3
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, [pushToken, userId, tokenType]);
      console.log('Push token updated successfully');
      
      await client.query('COMMIT');
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Push token updated successfully',
          tokenInfo: result.rows[0]
        }),
      };
    } else {
      // Insert new token
      const insertQuery = `
        INSERT INTO user_push_tokens (user_id, push_token, token_type, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING *
      `;
      
      const result = await client.query(insertQuery, [userId, pushToken, tokenType]);
      console.log('Push token saved successfully');
      
      await client.query('COMMIT');
      
      return {
        statusCode: 201,
        body: JSON.stringify({
          message: 'Push token saved successfully',
          tokenInfo: result.rows[0]
        }),
      };
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving push token:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Internal server error', 
        error: error.message 
      }),
    };
  } finally {
    client.release();
  }
};