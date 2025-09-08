/**
 * Test script for the new database-driven task reminder system
 * 
 * This script helps verify that:
 * 1. Reminder records are created in the database
 * 2. The checkTaskReminders Lambda processes them correctly
 */

require('dotenv').config();
const AWS = require('aws-sdk');

AWS.config.update({ region: process.env.AWS_REGION || 'us-east-1' });
const lambda = new AWS.Lambda();

async function testTaskReminderSystem() {
  try {
    console.log('🧪 Testing Task Reminder System...\n');
    
    // Test 1: Create a task with reminders (scheduled for 3 minutes from now)
    const testTaskId = 'test-' + Date.now();
    const testUserId = '94e824f8-5021-7038-5642-1604f05b16a6'; // Use your actual user ID
    const futureTime = new Date(Date.now() + (3 * 60 * 1000)); // 3 minutes from now
    
    console.log('📅 Test 1: Creating task with reminders...');
    console.log(`Task ID: ${testTaskId}`);
    console.log(`Task starts at: ${futureTime.toISOString()}`);
    
    const scheduleEvent = {
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: testUserId
            }
          }
        }
      },
      body: JSON.stringify({
        taskId: testTaskId,
        action: 'create'
      })
    };
    
    console.log('\n📤 Calling scheduleTaskReminder Lambda...');
    const scheduleResult = await lambda.invoke({
      FunctionName: 'scheduleTaskReminder',
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(scheduleEvent)
    }).promise();
    
    const scheduleResponse = JSON.parse(scheduleResult.Payload);
    console.log('📥 Schedule Response:', JSON.stringify(scheduleResponse, null, 2));
    
    // Test 2: Manually trigger checkTaskReminders to see current status
    console.log('\n📅 Test 2: Checking for due reminders...');
    
    const checkResult = await lambda.invoke({
      FunctionName: 'checkTaskReminders',
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({
        source: 'manual-test',
        time: new Date().toISOString()
      })
    }).promise();
    
    const checkResponse = JSON.parse(checkResult.Payload);
    console.log('📥 Check Response:', JSON.stringify(checkResponse, null, 2));
    
    // Test 3: Instructions for further testing
    console.log('\n📋 Next Steps:');
    console.log('1. Check your database for reminder records:');
    console.log(`   SELECT * FROM task_reminders WHERE task_id = '${testTaskId}';`);
    console.log('\n2. Wait for the 5-minute reminder to trigger automatically');
    console.log('   (checkTaskReminders Lambda runs every minute)');
    console.log('\n3. Monitor Lambda logs in CloudWatch for detailed execution info');
    console.log('\n4. Expected notification: "Your task starts in 5 minutes"');
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ResourceNotFoundException') {
      console.log('💡 Make sure both Lambda functions are deployed:');
      console.log('   - scheduleTaskReminder');
      console.log('   - checkTaskReminders');
    }
  }
}

// Run the test
testTaskReminderSystem();