const { pool } = require('/opt/db');

exports.handler = async (event) => {
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
    const {
      goal_name,
      goal_description,
      goal_target,
      goal_type,
      goal_color,
      goal_icon,
      goal_start_date,
      goal_target_days,
      goal_selected_days
    } = body;

    const requiredFields = ['goal_name', 'goal_target', 'goal_type', 'goal_start_date'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: `Missing required fields: ${missingFields.join(', ')}` }),
      };
    }

    // Validate goal_type
    if (!['daily', 'weekly', 'monthly'].includes(goal_type)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'goal_type must be daily, weekly, or monthly' }),
      };
    }

    // Calculate end date if goal_target_days is provided
    let goalEndDate = null;
    if (goal_target_days && goal_target_days !== 'forever') {
      const startDate = new Date(goal_start_date);
      const endDate = new Date(startDate);
      
      if (goal_type === 'daily') {
        endDate.setDate(startDate.getDate() + goal_target_days - 1);
      } else if (goal_type === 'weekly') {
        endDate.setDate(startDate.getDate() + (goal_target_days * 7) - 1);
      } else if (goal_type === 'monthly') {
        endDate.setMonth(startDate.getMonth() + goal_target_days);
        endDate.setDate(endDate.getDate() - 1);
      }
      
      goalEndDate = endDate.toISOString().split('T')[0];
    }

    const goal = {
      userId,
      goal_name,
      goal_description: goal_description || '',
      goal_target: parseInt(goal_target),
      goal_progress: 0,
      goal_type,
      goal_color: goal_color || '#5D87FF',
      goal_icon: goal_icon || 'flag',
      goal_start_date,
      goal_end_date: goalEndDate,
      goal_target_days: goal_target_days === 'forever' ? null : goal_target_days,
      goal_selected_days: goal_selected_days || null,
      created_at: new Date().toISOString(),
      is_completed: false
    };

    const query = `
      INSERT INTO goals (
        user_id, goal_name, goal_description, goal_target, goal_progress,
        goal_type, goal_color, goal_icon, goal_start_date, goal_end_date, 
        goal_target_days, goal_selected_days, created_at, is_completed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    console.log("About to run INSERT query");
    const result = await pool.query(query, [
      goal.userId,
      goal.goal_name,
      goal.goal_description,
      goal.goal_target,
      goal.goal_progress,
      goal.goal_type,
      goal.goal_color,
      goal.goal_icon,
      goal.goal_start_date,
      goal.goal_end_date,
      goal.goal_target_days,
      goal.goal_selected_days || null,
      goal.created_at,
      goal.is_completed
    ]);
    console.log("Query finished");

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Goal created successfully",
        goal: result.rows[0]
      }),
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error: error.message }),
    };
  }
};