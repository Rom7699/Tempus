const { getPool } = require('/opt/nodejs/db');

exports.handler = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));
    
    // Get user ID from API Gateway JWT authorizer
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorized User' }),
      };
    }

    // Query parameters for filtering
    const queryParams = event.queryStringParameters || {};
    const {
      notification_type,
      status,
      limit = '50',
      offset = '0'
    } = queryParams;

    const pool = getPool();
    
    let query = `
      SELECT id, notification_type, title, body, status, expo_ticket_id, error_message, created_at
      FROM notification_logs 
      WHERE user_id = $1
    `;
    
    const queryParams_array = [userId];
    let paramIndex = 2;

    if (notification_type) {
      query += ` AND notification_type = $${paramIndex}`;
      queryParams_array.push(notification_type);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      queryParams_array.push(status);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams_array.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, queryParams_array);

    // Also get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM notification_logs 
      WHERE user_id = $1
    `;
    
    const countParams = [userId];
    let countParamIndex = 2;

    if (notification_type) {
      countQuery += ` AND notification_type = $${countParamIndex}`;
      countParams.push(notification_type);
      countParamIndex++;
    }

    if (status) {
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].total);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Notification logs retrieved successfully',
        userId: userId,
        logs: result.rows,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + result.rows.length) < totalCount
        },
        filters: {
          notification_type: notification_type || null,
          status: status || null
        }
      }),
    };

  } catch (error) {
    console.error('Error getting notification logs:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Internal server error', 
        error: error.message 
      }),
    };
  }
};