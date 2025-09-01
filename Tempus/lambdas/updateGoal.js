const { getPool } = require('/opt/nodejs/db');

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

    const goalId = event.pathParameters?.goalId;
    const fields = JSON.parse(event.body || '{}');

    if (!goalId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'goalId is required' }),
      };
    }

    // Parse goalId as integer
    const parsedGoalId = parseInt(goalId);
    if (isNaN(parsedGoalId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'goalId must be a valid number' }),
      };
    }

    const allowedFields = [
      'goal_name', 'goal_description', 'goal_target', 
      'goal_progress', 'goal_type', 'goal_color', 
      'goal_icon', 'goal_start_date', 'goal_end_date',
      'goal_target_days', 'goal_selected_days', 'is_completed'
    ];

    const updates = [];
    const values = [];
    let index = 1;

    // Track if goal is being marked as completed
    const isCompletionToggle = fields.hasOwnProperty('is_completed');

    for (const key of allowedFields) {
      if (fields[key] !== undefined) {
        updates.push(`"${key}" = $${index++}`);
        values.push(fields[key]);
      }
    }

    // Always update the updated_at timestamp
    updates.push(`updated_at = $${index++}`);
    values.push(new Date().toISOString());

    // Set completion_date if marking as completed
    if (isCompletionToggle && fields.is_completed === true) {
      updates.push(`completion_date = $${index++}`);
      values.push(new Date().toISOString());
    } else if (isCompletionToggle && fields.is_completed === false) {
      // Clear completion_date if unmarking as completed
      updates.push(`completion_date = $${index++}`);
      values.push(null);
    }

    if (updates.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'No fields to update' }),
      };
    }

    values.push(userId); // $n+1
    values.push(parsedGoalId); // $n+2

    const query = `
      UPDATE goals
      SET ${updates.join(', ')}
      WHERE user_id = $${index++} AND goal_id = $${index}
      RETURNING *
    `;

    console.log("Update query:", query);
    console.log("Values:", values);

    const { rows } = await client.query(query, values);

    if (rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Goal not found' }),
      };
    }

    // Safe array conversion function
    const ensureArray = (value) => {
      if (value === null || value === undefined) return null;
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        // Handle PostgreSQL array format {1,2,3,4,5}
        if (value.startsWith('{') && value.endsWith('}')) {
          return value.slice(1, -1).split(',').map(Number);
        }
        // Handle JSON string format [1,2,3,4,5]
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      }
      return null;
    };

    // Process goal data to ensure arrays are properly formatted
    const processedGoal = {
      ...rows[0],
      goal_selected_days: ensureArray(rows[0].goal_selected_days)
    };

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Goal updated successfully', 
        goal: processedGoal 
      }),
    };
  } catch (error) {
    console.error('Error updating goal:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error: error.message }),
    };
  } finally {
    client.release();
  }
};