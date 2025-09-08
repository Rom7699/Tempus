const { getPool } = require('/opt/nodejs/db');
const axios = require('axios');

// API Gateway base URL
const apiBase = "https://b1s33elek9.execute-api.us-east-1.amazonaws.com";

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

    const body = JSON.parse(event.body || '{}');
    const { title, message: messageBody, data = {}, sound = 'default', priority = 'default' } = body;

    if (!title || !messageBody) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Missing required fields: title, message' 
        }),
      };
    }

    console.log(`Sending notification to user ${userId}: ${title}`);

    // Prepare notification data for sendExpoNotification Lambda
    const notificationPayload = {
      userId: userId,
      title: title,
      body: messageBody,
      data: {
        ...data,
        type: data.type || 'general'
      },
      sound: sound,
      priority: priority
    };

    console.log('Calling sendNotificationDirect via API Gateway:', JSON.stringify(notificationPayload, null, 2));

    try {
      // Call sendNotificationDirect via API Gateway
      const response = await axios.post(
        `${apiBase}/notifications/send-direct`,
        notificationPayload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('SendNotificationDirect API response:', response.status, response.data);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Notification sent successfully',
          userId: userId,
          title: title,
          ...response.data
        }),
      };

    } catch (apiError) {
      console.error('API call failed:', apiError.message);
      
      if (apiError.response) {
        // API returned an error response
        console.error('API error response:', apiError.response.status, apiError.response.data);
        return {
          statusCode: apiError.response.status,
          body: JSON.stringify(apiError.response.data),
        };
      } else {
        // Network or other error
        return {
          statusCode: 500,
          body: JSON.stringify({
            message: 'Failed to send notification',
            error: apiError.message
          }),
        };
      }
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