const { getPool } = require('/opt/nodejs/db'); // DB connection from layer

exports.handler = async (event) => {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorized User' }),
      };
    }

    const taskId = event.pathParameters?.taskId;
    const fields = JSON.parse(event.body || '{}');

    if (!taskId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'taskId is required' }),
      };
    }

    const allowedFields = [
      'task_name', 'task_description',
      'task_start_date', 'task_start_time',
      'task_end_date', 'task_end_time',
      'task_reminder', 'task_location',
      'task_attendees', 'task_priority',
      'task_energy_level', 'task_list_id',
      'task_goal_id',
      'is_ai_generated', 'is_event', 'is_completed'
    ];

    const updates = [];
    const values = [];
    let index = 1;

    // Track if is_completed is being toggled
    const isCompletedSet = fields.hasOwnProperty('is_completed');

    for (const key of allowedFields) {
      if (fields[key] !== undefined) {
        updates.push(`"${key}" = $${index++}`);
        values.push(fields[key]);
      }
    }

    if (updates.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'No fields to update' }),
      };
    }

    values.push(userId); // $n+1
    values.push(taskId); // $n+2

    const query = `
      UPDATE tasks
      SET ${updates.join(', ')}
      WHERE user_id = $${index++} AND task_id = $${index}
      RETURNING task_id, task_goal_id, is_completed
    `;

    // Use transaction to keep things consistent
    await client.query('BEGIN');

    const { rows } = await client.query(query, values);
    const updatedTask = rows[0];

    if (isCompletedSet && updatedTask.task_goal_id) {
      // Get the old task state
      const oldTaskRes = await client.query(
        `SELECT is_completed FROM tasks WHERE task_id = $1`,
        [taskId]
      );
      const oldCompleted = oldTaskRes.rows[0]?.is_completed;

      // If completion changed, update goal progress
      if (oldCompleted !== fields.is_completed) {
        if (fields.is_completed === true) {
          await client.query(
            `UPDATE goals
             SET goal_progress = goal_progress + 1,
                 updated_at = NOW()
             WHERE goal_id = $1 AND user_id = $2`,
            [updatedTask.task_goal_id, userId]
          );
        } else if (fields.is_completed === false) {
          await client.query(
            `UPDATE goals
             SET goal_progress = GREATEST(goal_progress - 1, 0),
                 updated_at = NOW()
             WHERE goal_id = $1 AND user_id = $2`,
            [updatedTask.task_goal_id, userId]
          );
        }
      }
    }

    await client.query('COMMIT');

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Task updated successfully', task: updatedTask }),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating task:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error: error.message }),
    };
  } finally {
    client.release();
  }
};
