const { getPool } = require('/opt/nodejs/db'); // from DB layer (db.js in /opt)
const { v4: uuidv4 } = require('uuid'); // uuid from uuid layer

exports.handler = async (event) => {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorized User' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { tasks: tasksArray } = body;

    // Validate input
    if (!tasksArray || !Array.isArray(tasksArray)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Request body must contain a "tasks" array' }),
      };
    }

    if (tasksArray.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Tasks array cannot be empty' }),
      };
    }

    if (tasksArray.length > 100) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Cannot create more than 100 tasks at once' }),
      };
    }

    // Validate each task and prepare data
    const requiredFields = ['task_name', 'task_start_date', 'task_start_time'];
    const preparedTasks = [];
    const validationErrors = [];

    for (let i = 0; i < tasksArray.length; i++) {
      const taskData = tasksArray[i];
      const missingFields = requiredFields.filter(field => !taskData[field]);

      if (missingFields.length > 0) {
        validationErrors.push(`Task ${i + 1}: Missing required fields: ${missingFields.join(', ')}`);
        continue;
      }

      // Prepare task object
      const task = {
        userId,
        taskId: uuidv4(),
        task_name: taskData.task_name,
        task_description: taskData.task_description || null,
        task_list_id: taskData.task_list_id || null,
        task_goal_id: taskData.task_goal_id || null,
        task_start_date: taskData.task_start_date,
        task_start_time: taskData.task_start_time,
        task_end_date: taskData.task_end_date || null,
        task_end_time: taskData.task_end_time || null,
        task_reminder: taskData.task_reminder || null,
        task_location: taskData.task_location || null,
        task_attendees: taskData.task_attendees || null,
        task_priority: taskData.task_priority || 1,
        task_energy_level: taskData.task_energy_level || null,
        taskCreationDate: new Date().toISOString(),
        is_ai_generated: taskData.is_ai_generated || false,
        is_event: taskData.is_event || false,
        is_completed: taskData.is_event ? null : (taskData.is_completed ?? false),
      };

      preparedTasks.push(task);
    }

    // If there are validation errors, return them
    if (validationErrors.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Validation errors found',
          errors: validationErrors,
          validTasks: preparedTasks.length,
          totalTasks: tasksArray.length
        }),
      };
    }

    console.log(`About to insert ${preparedTasks.length} tasks`);

    // Use transaction for consistency
    await client.query('BEGIN');

    const insertedTasks = [];
    const query = `
      INSERT INTO tasks (
        user_id, task_id, task_name, task_description, task_list_id, task_goal_id,
        task_start_date, task_start_time, task_end_date, task_end_time, task_reminder, 
        task_location, task_attendees, task_priority, task_energy_level, task_creation_date,
        is_ai_generated, is_event, is_completed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING task_id, task_name, task_start_date, task_start_time, is_completed
    `;

    // Insert tasks one by one to get individual results and handle potential errors
    for (const task of preparedTasks) {
      try {
        const result = await client.query(query, [
          task.userId,
          task.taskId,
          task.task_name,
          task.task_description,
          task.task_list_id,
          task.task_goal_id,
          task.task_start_date,
          task.task_start_time,
          task.task_end_date,
          task.task_end_time,
          task.task_reminder,
          task.task_location,
          task.task_attendees,
          task.task_priority,
          task.task_energy_level,
          task.taskCreationDate,
          task.is_ai_generated,
          task.is_event,
          task.is_completed,
        ]);

        insertedTasks.push(result.rows[0]);
      } catch (taskError) {
        console.error(`Error inserting task "${task.task_name}":`, taskError);
        // Continue with other tasks, but log the error
        insertedTasks.push({
          error: `Failed to insert task "${task.task_name}": ${taskError.message}`,
          task_name: task.task_name
        });
      }
    }

    await client.query('COMMIT');
    
    console.log(`Successfully inserted ${insertedTasks.filter(t => !t.error).length} out of ${preparedTasks.length} tasks`);

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: `Bulk task creation completed`,
        summary: {
          totalRequested: tasksArray.length,
          successfullyCreated: insertedTasks.filter(t => !t.error).length,
          failed: insertedTasks.filter(t => t.error).length
        },
        tasks: insertedTasks
      }),
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in bulk task creation:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error: error.message }),
    };
  } finally {
    client.release();
  }
};