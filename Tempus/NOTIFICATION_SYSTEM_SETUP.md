# Notification System Setup Guide

This document outlines the complete notification system implementation for your React Native app with AWS backend.

## System Architecture

```
React Native App (Expo) 
    ↓ (registers push token)
API Gateway → savePushToken Lambda → PostgreSQL

Task Creation/Update
    ↓ (triggers reminder scheduling)  
API Gateway → scheduleTaskReminder Lambda → task_reminders table

EventBridge Cron (every minute)
    ↓ 
checkTaskReminders Lambda → queries task_reminders table
    ↓ (for due reminders)
API Gateway → sendNotificationDirect Lambda → Expo Push API → User Device

Manual Notifications
    ↓
API Gateway → sendNotification Lambda → API Gateway → sendNotificationDirect Lambda → Expo Push API
```

## Files Created

### Frontend (React Native)
- `services/NotificationService.ts` - Expo notification integration
- `context/ApiContext.tsx` - Updated with notification methods

### Backend (AWS Lambda)
- `lambdas/savePushToken.js` - Store user device tokens
- `lambdas/getUserPushToken.js` - Retrieve user tokens  
- `lambdas/sendNotificationDirect.js` - Send notifications directly via Expo API (no auth required)
- `lambdas/scheduleTaskReminder.js` - Create/delete reminder records in database
- `lambdas/checkTaskReminders.js` - Triggered every minute to check for due reminders
- `lambdas/sendNotification.js` - API endpoint for manual notifications (with auth)
- `lambdas/getNotificationLogs.js` - Get notification history

### Database
- `database/create_push_tokens_table.sql` - Store device tokens
- `database/create_notification_logs_table.sql` - Track sent notifications
- `database/create_task_reminders_table.sql` - Store task reminders to be processed

### Testing
- `test-notification-system.js` - End-to-end test script

## Deployment Steps

### 1. Database Setup

Run these SQL scripts on your PostgreSQL database:

```bash
psql -h your-db-host -U your-username -d your-database -f database/create_push_tokens_table.sql
psql -h your-db-host -U your-username -d your-database -f database/create_notification_logs_table.sql
psql -h your-db-host -U your-username -d your-database -f database/create_task_reminders_table.sql
```

### 2. Lambda Function Deployment

Deploy each Lambda function to AWS:

```bash
# Package and deploy each function
zip -r savePushToken.zip lambdas/savePushToken.js
aws lambda create-function --function-name savePushToken --zip-file fileb://savePushToken.zip --runtime nodejs18.x --role arn:aws:iam::account:role/lambda-execution-role --handler index.handler

# Repeat for all Lambda functions:
# - getUserPushToken
# - sendNotificationDirect
# - scheduleTaskReminder  
# - checkTaskReminders
# - sendNotification
# - getNotificationLogs
```

### 3. API Gateway Setup

Create API Gateway endpoints:

#### Routes to create:
- `POST /notifications/register-token` → savePushToken
- `GET /notifications/token/{userId}` → getUserPushToken  
- `POST /notifications/send` → sendNotification (requires authentication)
- `POST /notifications/send-direct` → sendNotificationDirect (no authentication - for system use)
- `POST /notifications/schedule-reminder` → scheduleTaskReminder
- `GET /notifications/logs` → getNotificationLogs

#### CORS Configuration:
Enable CORS for all endpoints with:
- Access-Control-Allow-Origin: *
- Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token
- Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS

### 4. EventBridge Cron Setup

Create an EventBridge rule to trigger checkTaskReminders every minute:

**Rule Name**: `check-task-reminders-cron`
**Schedule Expression**: `rate(1 minute)`
**Target**: `checkTaskReminders` Lambda function

This will check the `task_reminders` table every minute for due notifications.

### 5. IAM Permissions (LabRole Compatible)

The system is designed to work with AWS Academy LabRole restrictions. No special EventBridge or Lambda invoke permissions are needed because:

- Uses database-driven approach instead of individual EventBridge rules
- Uses API Gateway HTTP calls instead of Lambda invocation
- Only requires one cron rule for the reminder checking system

### 6. Environment Variables

Set these environment variables for your Lambda functions:

- `AWS_REGION` - Your AWS region
- `AWS_ACCOUNT_ID` - Your AWS account ID
- `DB_HOST` - Your PostgreSQL host
- `DB_NAME` - Database name
- `DB_USER` - Database username  
- `DB_PASSWORD` - Database password

### 7. Frontend Integration

In your React Native app, initialize notifications:

```typescript
// In your main App component or where you handle auth
useEffect(() => {
  const initNotifications = async () => {
    try {
      // Register for push notifications and get token
      const token = await api.registerPushNotifications();
      
      if (token) {
        // Save token to backend
        await api.savePushToken(token.data, token.type);
        
        // Setup notification listeners
        api.setupNotificationListeners();
      }
    } catch (error) {
      console.error('Failed to setup notifications:', error);
    }
  };
  
  initNotifications();
}, []);
```

### 8. Task Integration

When creating/updating tasks with reminders, call the scheduling API:

```typescript
// After creating/updating a task with task_reminder = true
if (task.task_reminder && task.task_start_date && task.task_start_time) {
  try {
    const response = await api.scheduleTaskReminderImpl(task.task_id, 'create');
    
    if (response.success) {
      console.log('Task reminders scheduled successfully');
    }
  } catch (error) {
    console.error('Failed to schedule task reminders:', error);
  }
}

// When deleting a task with reminders
if (task.task_reminder) {
  try {
    await api.scheduleTaskReminderImpl(task.task_id, 'delete');
  } catch (error) {
    console.error('Failed to delete task reminders:', error);
  }
}
```

## Testing

1. Update the configuration in `test-notification-system.js`
2. Run the test script:

```bash
node test-notification-system.js
```

## Notification Types

The system supports these notification types:

### Task Reminders (Automatic)  
- Triggered by EventBridge cron job every minute
- Sent 5 minutes before task start time (default)
- Only for tasks with `task_reminder = true`
- Stored in `task_reminders` database table
- High priority notifications

### Manual Notifications
- Sent via API endpoint
- Configurable title, message, and data
- Support for different priorities and sounds

## Monitoring

- Check CloudWatch logs for Lambda execution logs
- Monitor EventBridge rules in AWS console
- Query `notification_logs` table for delivery status
- Use the `getNotificationLogs` API to retrieve user notification history

## Troubleshooting

### Common Issues:

1. **Expo push token format errors**
   - Ensure tokens start with 'ExponentPushToken[' or 'ExpoPushToken['
   
2. **EventBridge permissions**
   - Verify Lambda role has EventBridge permissions
   
3. **Database connection**
   - Check database credentials and network access
   
4. **Notification not received**
   - Check device notification permissions
   - Verify push token is valid and active
   - Check notification logs for delivery status

### Debug Commands:

```bash
# Check Lambda logs
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/

# List EventBridge rules
aws events list-rules --name-prefix task-reminder

# Test Lambda function directly
aws lambda invoke --function-name sendNotification --payload file://test-payload.json response.json
```

## Next Steps

After deployment, consider adding:

1. **Batch notifications** for multiple users
2. **Notification preferences** per user  
3. **Rich notifications** with images/actions
4. **Analytics dashboard** for notification metrics
5. **A/B testing** for notification content
6. **Notification templates** for consistent messaging