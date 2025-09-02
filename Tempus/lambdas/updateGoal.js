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
      'goal_cycle_duration', 'goal_selected_days', 'is_completed',
      'is_cycling', 'current_cycle_start', 'current_cycle_end', 'cycles_completed'
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

    // Recalculate goal_end_date and current cycle if relevant fields changed
    const needsRecalculation = fields.goal_start_date || fields.goal_cycle_duration || fields.is_cycling || fields.goal_type;
    
    if (needsRecalculation) {
      // First, get current goal data to merge with updates
      const currentGoalQuery = await client.query('SELECT * FROM goals WHERE user_id = $1 AND goal_id = $2', [userId, parsedGoalId]);
      if (currentGoalQuery.rows.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: 'Goal not found' }),
        };
      }
      
      const currentGoal = currentGoalQuery.rows[0];
      
      // Merge current values with updates
      const updatedGoal = {
        goal_start_date: fields.goal_start_date || currentGoal.goal_start_date,
        goal_cycle_duration: fields.goal_cycle_duration !== undefined ? fields.goal_cycle_duration : currentGoal.goal_cycle_duration,
        is_cycling: fields.is_cycling !== undefined ? fields.is_cycling : currentGoal.is_cycling,
        goal_type: fields.goal_type || currentGoal.goal_type
      };
      
      // Recalculate goal_end_date if cycling and has duration
      if (updatedGoal.is_cycling && updatedGoal.goal_cycle_duration && updatedGoal.goal_cycle_duration !== 'forever') {
        const startDate = new Date(updatedGoal.goal_start_date);
        const endDate = new Date(startDate);
        
        if (updatedGoal.goal_type === 'daily') {
          endDate.setDate(startDate.getDate() + updatedGoal.goal_cycle_duration - 1);
        } else if (updatedGoal.goal_type === 'weekly') {
          endDate.setDate(startDate.getDate() + (updatedGoal.goal_cycle_duration * 7) - 1);
        } else if (updatedGoal.goal_type === 'monthly') {
          endDate.setMonth(startDate.getMonth() + updatedGoal.goal_cycle_duration);
          endDate.setDate(endDate.getDate() - 1);
        }
        
        updates.push(`goal_end_date = $${index++}`);
        values.push(endDate.toISOString().split('T')[0]);
      }
      
      // Recalculate current cycle dates if cycling
      if (updatedGoal.is_cycling) {
        const startDate = new Date(updatedGoal.goal_start_date);
        const cycleEndDate = new Date(startDate);
        
        if (updatedGoal.goal_type === 'daily') {
          // For daily goals, each cycle is 1 day long - end at end of start day
          cycleEndDate.setDate(startDate.getDate());
          cycleEndDate.setHours(23, 59, 59, 999); // End of day
        } else if (updatedGoal.goal_type === 'weekly') {
          // Weekly cycle is exactly 7 days long (1 week)
          cycleEndDate.setDate(startDate.getDate() + 6); // 7 days total (0-6)
        } else if (updatedGoal.goal_type === 'monthly') {
          // Monthly cycle is exactly 1 month long
          cycleEndDate.setMonth(startDate.getMonth() + 1);
          cycleEndDate.setDate(cycleEndDate.getDate() - 1);
        }
        
        updates.push(`current_cycle_start = $${index++}`);
        values.push(updatedGoal.goal_start_date);
        updates.push(`current_cycle_end = $${index++}`);
        values.push(cycleEndDate.toISOString().split('T')[0]);
        updates.push(`cycles_completed = $${index++}`);
        values.push(0); // Reset cycles when recalculating
      }
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