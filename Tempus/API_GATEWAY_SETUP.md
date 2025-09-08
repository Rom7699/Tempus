# API Gateway Setup for Notification System

## Critical Endpoint Required

Your notification system requires this API Gateway endpoint to function:

**`POST /notifications/send-direct`** → `sendNotificationDirect` Lambda

This endpoint is used by:
- `checkTaskReminders` Lambda (automatic reminders)
- `sendNotification` Lambda (manual notifications)

## Step-by-Step Setup Instructions

### 1. Open API Gateway Console
1. Go to AWS Console → API Gateway
2. Select your existing API (likely the one with your other endpoints)
3. Click on "Resources" in the left panel

### 2. Create the Notifications Resource (if not exists)
1. Select the root resource "/"
2. Click "Actions" → "Create Resource"
3. Configure:
   - **Resource Name**: `notifications`
   - **Resource Path**: `notifications`
   - ✅ Enable API Gateway CORS
4. Click "Create Resource"

### 3. Create the send-direct Method
1. Select the `/notifications` resource
2. Click "Actions" → "Create Resource" again
3. Configure:
   - **Resource Name**: `send-direct`  
   - **Resource Path**: `send-direct`
   - ✅ Enable API Gateway CORS
4. Click "Create Resource"

### 4. Create POST Method
1. Select the `/notifications/send-direct` resource
2. Click "Actions" → "Create Method"
3. Select "POST" from dropdown, click the checkmark
4. Configure Integration:
   - **Integration Type**: Lambda Function
   - ✅ Use Lambda Proxy integration
   - **Lambda Region**: us-east-1 (or your region)
   - **Lambda Function**: `sendNotificationDirect`
5. Click "Save"
6. Click "OK" when prompted to give API Gateway permission to invoke your Lambda

### 5. Enable CORS (Important!)
1. Select the `/notifications/send-direct` resource
2. Click "Actions" → "Enable CORS"
3. Configure:
   - **Access-Control-Allow-Origin**: `*`
   - **Access-Control-Allow-Headers**: `Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token`
   - **Access-Control-Allow-Methods**: Select `POST` and `OPTIONS`
4. Click "Enable CORS and replace existing CORS headers"

### 6. Remove Authentication (Critical!)
The `send-direct` endpoint should NOT require authentication since it's called by system lambdas:

1. Select the `POST` method under `/notifications/send-direct`
2. Click "Method Request"  
3. Under "Authorization", ensure it's set to "NONE"
4. Click "Actions" → "Deploy API"
5. Select your deployment stage (usually "default" or "prod")
6. Click "Deploy"

### 7. Test the Endpoint
After deployment, test the endpoint:

```bash
curl -X POST "https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/YOUR-STAGE/notifications/send-direct" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "title": "Test Notification",
    "body": "This is a test message"
  }'
```

Expected response: `{"message": "Notification sent successfully", ...}`

### 8. Update Your Lambda Environment
Make sure both `checkTaskReminders` and `sendNotification` lambdas have the correct API base URL:

In both lambda functions, verify this line matches your API Gateway URL:
```javascript
const apiBase = "https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/YOUR-STAGE";
```

## Troubleshooting

### Common Issues:

1. **CORS Errors**:
   - Ensure CORS is enabled on the `/notifications/send-direct` resource
   - Deploy the API after enabling CORS

2. **401 Unauthorized**:
   - Verify the POST method Authorization is set to "NONE"
   - This endpoint should NOT require authentication

3. **500 Internal Server Error**:
   - Check CloudWatch logs for the `sendNotificationDirect` lambda
   - Verify the lambda has database access and required environment variables

4. **Lambda not found**:
   - Verify the lambda function name is exactly `sendNotificationDirect`
   - Check the integration configuration in API Gateway

### Verification Steps:

1. **Check API Gateway URL**: 
   - Go to API Gateway → Your API → Stages → Your Stage
   - Copy the "Invoke URL" 
   - The endpoint will be: `{Invoke URL}/notifications/send-direct`

2. **Verify Lambda Integration**:
   - In API Gateway, click on the POST method
   - You should see: Method Request → Integration Request → Lambda Function: sendNotificationDirect

3. **Test from Lambda**:
   You can test if the endpoint works by running this code in the `checkTaskReminders` lambda test console:

```javascript
const axios = require('axios');

const testPayload = {
  userId: "test-user",
  title: "Test",
  body: "Test message"
};

const response = await axios.post(
  'https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/YOUR-STAGE/notifications/send-direct',
  testPayload,
  {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000
  }
);

console.log('Response:', response.data);
```

## Next Steps After Setup

Once the API Gateway endpoint is created:

1. **Create EventBridge Cron Rule**:
   - Rule Name: `check-task-reminders-cron`
   - Schedule: `rate(1 minute)`  
   - Target: `checkTaskReminders` Lambda

2. **Test Task Reminder Flow**:
   - Create a task with reminder enabled
   - Set task start time to 6-10 minutes from now
   - Check CloudWatch logs for `checkTaskReminders` to see it processing reminders

3. **Verify Notification Delivery**:
   - Make sure you have a valid Expo push token registered for your user
   - Check the device receives the notification 5 minutes before the task start time

The system is now complete and should work within LabRole permission restrictions!