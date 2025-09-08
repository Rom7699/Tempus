const AWS = require('aws-sdk');

const lambda = new AWS.Lambda();

exports.handler = async (event) => {
  try {
    console.log("Received EventBridge event:", JSON.stringify(event, null, 2));
    
    const { 
      taskId, 
      userId, 
      taskName, 
      reminderType, 
      scheduledFor, 
      taskStartTime 
    } = event;

    if (!taskId || !userId || !taskName) {
      console.error('Missing required fields in EventBridge event:', { taskId, userId, taskName });
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Missing required fields: taskId, userId, taskName' 
        }),
      };
    }

    console.log(`Sending task reminder for task "${taskName}" to user ${userId}`);

    // Format the reminder message based on type
    const reminderMessages = {
      '60_min_before': 'in 1 hour',
      '30_min_before': 'in 30 minutes', 
      '15_min_before': 'in 15 minutes',
      '5_min_before': 'in 5 minutes'
    };

    const timeText = reminderMessages[reminderType] || 'soon';
    const title = `Task Reminder: ${taskName}`;
    const body = `Your task "${taskName}" starts ${timeText}`;

    // Prepare notification data for sendExpoNotification Lambda
    const notificationPayload = {
      userId: userId,
      title: title,
      body: body,
      data: {
        type: 'task_reminder',
        taskId: taskId,
        taskName: taskName,
        reminderType: reminderType,
        taskStartTime: taskStartTime,
        scheduledFor: scheduledFor
      },
      sound: 'default',
      priority: 'high' // Task reminders should be high priority
    };

    console.log('Invoking sendExpoNotification Lambda with payload:', JSON.stringify(notificationPayload, null, 2));

    // Invoke the sendExpoNotification Lambda function
    const lambdaParams = {
      FunctionName: 'sendExpoNotification',
      InvocationType: 'Event', // Asynchronous invocation
      Payload: JSON.stringify(notificationPayload)
    };

    const invokeResult = await lambda.invoke(lambdaParams).promise();
    
    console.log('Successfully invoked sendExpoNotification Lambda');
    console.log('Invoke result:', JSON.stringify(invokeResult, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Task reminder notification triggered successfully',
        taskId: taskId,
        userId: userId,
        taskName: taskName,
        reminderType: reminderType,
        notificationSent: true
      }),
    };

  } catch (error) {
    console.error('Error sending task reminder:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Error sending task reminder', 
        error: error.message,
        taskId: event.taskId || 'unknown',
        userId: event.userId || 'unknown'
      }),
    };
  }
};