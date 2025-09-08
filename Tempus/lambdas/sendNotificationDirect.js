const { getPool } = require('/opt/nodejs/db');
const axios = require('axios');

exports.handler = async (event) => {
  try {
    
    let notificationData;
    
    // Handle both direct invocation and API Gateway
    if (event.body) {
      notificationData = JSON.parse(event.body);
    } else {
      notificationData = event;
    }
    
    const { 
      userId, 
      title, 
      body: messageBody, 
      data = {},
      sound = 'default',
      priority = 'default'
    } = notificationData;

    if (!userId || !title || !messageBody) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Missing required fields: userId, title, body' 
        }),
      };
    }

    const pool = getPool();
    
    // Get user's push token
    const tokenQuery = `
      SELECT push_token, token_type 
      FROM user_push_tokens 
      WHERE user_id = $1 AND token_type = 'expo' AND is_active = true
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    
    const tokenResult = await pool.query(tokenQuery, [userId]);

    if (tokenResult.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          message: 'No active push token found for user',
          userId 
        }),
      };
    }

    const pushToken = tokenResult.rows[0].push_token;

    // Validate Expo push token format
    if (!pushToken.startsWith('ExponentPushToken[') && !pushToken.startsWith('ExpoPushToken[')) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Invalid Expo push token format' 
        }),
      };
    }

    // Prepare notification message for Expo
    const message = {
      to: pushToken,
      sound: sound,
      title: title,
      body: messageBody,
      data: {
        ...data,
        timestamp: new Date().toISOString()
      }
    };

    // Send notification to Expo Push API
    const expoResponse = await axios.post('https://exp.host/--/api/v2/push/send', message, {
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });

    // Check if notification was accepted
    if (expoResponse.data.data && expoResponse.data.data.status === 'ok') {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Notification sent successfully',
          expoTicketId: expoResponse.data.data.id,
          status: expoResponse.data.data.status
        }),
      };
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Failed to send notification',
          error: expoResponse.data
        }),
      };
    }

  } catch (error) {
    console.error('Error sending notification:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Internal server error', 
        error: error.message 
      }),
    };
  }
};