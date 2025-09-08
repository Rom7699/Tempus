const { getPool } = require('/opt/nodejs/db');
const axios = require('axios');

exports.handler = async (event) => {
  try {
    let notificationData;
    
    if (event.Records && event.Records.length > 0) {
      notificationData = JSON.parse(event.Records[0].body);
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

    if (!pushToken.startsWith('ExponentPushToken[') && !pushToken.startsWith('ExpoPushToken[')) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Invalid Expo push token format' 
        }),
      };
    }

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

    if (priority === 'high') {
      message.priority = 'high';
      message.channelId = 'default';
    }

    const expoResponse = await axios.post('https://exp.host/--/api/v2/push/send', message, {
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });

    if (expoResponse.data.data && expoResponse.data.data.status === 'ok') {
      const logQuery = `
        INSERT INTO notification_logs (user_id, notification_type, title, body, push_token, status, expo_ticket_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `;
      
      try {
        await pool.query(logQuery, [
          userId,
          data.type || 'general',
          title,
          messageBody,
          pushToken,
          'sent',
          expoResponse.data.data.id || null
        ]);
      } catch (logError) {
        console.warn('Failed to log notification:', logError.message);
      }

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
    console.error('Error sending Expo notification:', error);
    
    if (error.response && error.response.data) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Expo API error',
          error: error.response.data,
          details: error.message
        }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Internal server error', 
        error: error.message 
      }),
    };
  }
};