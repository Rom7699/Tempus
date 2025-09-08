const AWS = require('aws-sdk');
const { getPool } = require('/opt/nodejs/db');

exports.handler = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));
    
    // Handle both API Gateway calls and direct Lambda invocation
    let taskId, userId, action;

    userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
      
      if (!userId) {
        return {
          statusCode: 401,
          body: JSON.stringify({ message: 'Unauthorized User' }),
        };
      }
    
    if (event.body) {
      // Called via API Gateway - get user ID from JWT and other data from body
      const body = JSON.parse(event.body);
      taskId = body.taskId;
      action = body.action || 'create';
    } else {
      // Direct Lambda invocation
      taskId = event.taskId;
      action = event.action || 'create';
    }
    
    
    if (!taskId || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Missing required fields: taskId, userId' 
        }),
      };
    }

    const pool = getPool();
    
    // Get task details
    const taskQuery = `
      SELECT task_id, task_name, task_start_date, task_start_time, task_reminder, user_id
      FROM tasks 
      WHERE task_id = $1 AND user_id = $2
    `;
    
    const taskResult = await pool.query(taskQuery, [taskId, userId]);
    
    if (taskResult.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          message: 'Task not found',
          taskId,
          userId 
        }),
      };
    }

    const task = taskResult.rows[0];
    
    // If action is delete, remove existing reminder records from database
    if (action === 'delete') {
        try {
        const deleteQuery = 'DELETE FROM task_reminders WHERE task_id = $1';
        const deleteResult = await pool.query(deleteQuery, [taskId]);
        
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: 'Task reminders deleted successfully',
            taskId,
            deletedCount: deleteResult.rowCount
          }),
        };
      } catch (error) {
        console.error('Error deleting reminder records:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            message: 'Error deleting reminder records', 
            error: error.message 
          }),
        };
      }
    }

    // If task doesn't have reminder enabled, skip scheduling
    if (!task.task_reminder) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Task reminders not enabled',
          taskId
        }),
      };
    }

    // Handle database date format - convert Date object to ISO date string
    let dateString;
    if (task.task_start_date instanceof Date) {
      dateString = task.task_start_date.toISOString().split('T')[0];
    } else if (typeof task.task_start_date === 'string' && task.task_start_date.includes('GMT')) {
      const tempDate = new Date(task.task_start_date);
      dateString = tempDate.toISOString().split('T')[0];
    } else {
      dateString = task.task_start_date;
    }
    
    // Parse date and time safely with Israel timezone (UTC+3) conversion
    // Create date assuming it's in Israel timezone (UTC+3)
    const taskDateTimeLocal = new Date(`${dateString}T${task.task_start_time}`);
    
    // Convert from Israel time (UTC+3) to UTC by subtracting 3 hours
    const taskDateTime = new Date(taskDateTimeLocal.getTime() - (3 * 60 * 60 * 1000));
    const now = new Date();
    
    // Check if date parsing was successful
    if (isNaN(taskDateTime.getTime())) {
      console.error(`Invalid date/time format: ${dateString}T${task.task_start_time}`);
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Invalid task date/time format',
          taskId,
          originalDate: task.task_start_date,
          processedDate: dateString,
          providedTime: task.task_start_time
        }),
      };
    }

    // Skip if task is in the past
    if (taskDateTime <= now) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Task is in the past, no reminders scheduled',
          taskId,
          taskDateTime: taskDateTime.toISOString()
        }),
      };
    }

    // First, delete any existing reminders for this task (handles updates)
    await pool.query('DELETE FROM task_reminders WHERE task_id = $1', [taskId]);

    // Default reminder: 5 minutes before task (configurable for future)
    const reminderMinutes = 5; // Easy to change to [5, 15, 30] etc. in the future
    const reminderTime = new Date(taskDateTime.getTime() - (reminderMinutes * 60 * 1000));
    
    // Skip if reminder time is in the past
    if (reminderTime <= now) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Task reminder not scheduled - time is in the past',
          taskId: task.task_id,
          taskName: task.task_name,
          taskStartTime: taskDateTime.toISOString(),
          reminderTime: reminderTime.toISOString(),
          status: 'skipped'
        }),
      };
    }

    try {
      // Insert reminder record into database
      const insertQuery = `
        INSERT INTO task_reminders (
          task_id, user_id, task_name, task_start_datetime, 
          reminder_datetime, minutes_before
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING reminder_id
      `;
      
      const insertResult = await pool.query(insertQuery, [
        task.task_id,
        task.user_id,
        task.task_name,
        taskDateTime,
        reminderTime,
        reminderMinutes
      ]);
      
      const reminderId = insertResult.rows[0].reminder_id;
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Task reminder scheduled successfully',
          taskId: task.task_id,
          taskName: task.task_name,
          taskStartTime: taskDateTime.toISOString(),
          reminder: {
            reminderId,
            reminderTime: reminderTime.toISOString(),
            minutesBefore: reminderMinutes,
            status: 'scheduled'
          }
        }),
      };
      
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Failed to schedule task reminder',
          taskId: task.task_id,
          error: error.message
        }),
      };
    }

  } catch (error) {
    console.error('Error scheduling task reminders:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Internal server error', 
        error: error.message 
      }),
    };
  }
};