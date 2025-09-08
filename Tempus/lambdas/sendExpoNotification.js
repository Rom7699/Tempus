const { getPool } = require('/opt/nodejs/db');
const axios = require('axios');

exports.handler = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));
    
    let notificationData;
    
    // Handle both direct Lambda invocation and EventBridge trigger
    if (event.Records && event.Records.length > 0) {
      // SQS/EventBridge message
      notificationData = JSON.parse(event.Records[0].body);
    } else {
      // Direct invocation
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
      console.error('Missing required notification data:', { userId, title, messageBody });
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Missing required fields: userId, title, body' 
        }),
      };
    }

    console.log(`Sending notification to user ${userId}: ${title}`);

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
      console.log(`No active Expo push token found for user ${userId}`);
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          message: 'No active push token found for user',
          userId 
        }),
      };
    }

    const pushToken = tokenResult.rows[0].push_token;
    console.log(`Found push token for user: ${pushToken.substring(0, 20)}...`);

    // Validate Expo push token format
    if (!pushToken.startsWith('ExponentPushToken[') && !pushToken.startsWith('ExpoPushToken[')) {
      console.error('Invalid Expo push token format:', pushToken);
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

    // Set priority if specified
    if (priority === 'high') {
      message.priority = 'high';
      message.channelId = 'default';
    }

    console.log('Sending notification to Expo:', JSON.stringify(message, null, 2));

    // Send notification to Expo Push API
    const expoResponse = await axios.post('https://exp.host/--/api/v2/push/send', message, {
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });

    console.log('Expo API response:', JSON.stringify(expoResponse.data, null, 2));

    // Check if notification was accepted
    if (expoResponse.data.data && expoResponse.data.data.status === 'ok') {
      console.log('Notification sent successfully');
      
      // Log notification for analytics/debugging
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
        // Don't fail the main operation if logging fails
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
      console.error('Expo notification failed:', expoResponse.data);
      
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
    
    // If it's an Expo API error, include more details
    if (error.response && error.response.data) {
      console.error('Expo API error response:', error.response.data);
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