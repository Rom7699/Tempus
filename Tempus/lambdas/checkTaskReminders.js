const { getPool } = require('/opt/nodejs/db');
const axios = require('axios');

const apiBase = "https://b1s33elek9.execute-api.us-east-1.amazonaws.com";

exports.handler = async (event) => {
  try {
    console.log('🕐 Checking for due task reminders...');
    
    const pool = getPool();
    
    // Query for reminders that are due but not sent yet
    const reminderQuery = `
      SELECT 
        reminder_id,
        task_id,
        user_id,
        task_name,
        task_start_datetime,
        reminder_datetime,
        minutes_before
      FROM task_reminders 
      WHERE reminder_datetime <= NOW() 
        AND is_sent = false
      ORDER BY reminder_datetime ASC
      LIMIT 50
    `;
    
    const reminderResult = await pool.query(reminderQuery);
    const dueReminders = reminderResult.rows;
    
    console.log(`📋 Found ${dueReminders.length} due reminders to process`);
    
    if (dueReminders.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'No reminders due',
          processedCount: 0
        })
      };
    }
    
    let successCount = 0;
    let failureCount = 0;
    
    // Process each due reminder
    for (const reminder of dueReminders) {
      
      try {
        const notificationPayload = {
          userId: reminder.user_id,
          title: `Task Reminder: ${reminder.task_name}`,
          body: `Your task "${reminder.task_name}" starts in ${reminder.minutes_before} minutes`,
          data: {
            type: 'task_reminder',
            taskId: reminder.task_id,
            taskName: reminder.task_name,
            taskStartTime: reminder.task_start_datetime,
            minutesBefore: reminder.minutes_before
          }
        };
        
        const notificationResponse = await axios.post(
          `${apiBase}/notifications/send-direct`,
          notificationPayload,
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 8000
          }
        );
        
        if (notificationResponse.status === 200) {
          await pool.query(
            'UPDATE task_reminders SET is_sent = true, sent_at = NOW() WHERE reminder_id = $1',
            [reminder.reminder_id]
          );
          successCount++;
        } else {
          failureCount++;
        }
        
      } catch (error) {
        failureCount++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Reminder processing complete',
        processedCount: dueReminders.length,
        successCount,
        failureCount,
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('💥 Error in checkTaskReminders:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Internal server error', 
        error: error.message 
      })
    };
  }
};