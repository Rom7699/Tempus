const { getPool } = require('/opt/nodejs/db');

exports.handler = async (event) => {
  try {
    const pool = getPool();
    
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
      goal_end_date,
      goal_cycle_duration,
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

    // Calculate end date automatically if cycle duration is provided
    let calculatedEndDate = goal_end_date; // Use explicit end date if provided
    
    if (!calculatedEndDate && goal_cycle_duration && goal_cycle_duration !== 'forever') {
      const startDate = new Date(goal_start_date);
      const endDate = new Date(startDate);
      
      if (goal_type === 'daily') {
        endDate.setDate(startDate.getDate() + goal_cycle_duration);
      } else if (goal_type === 'weekly') {
        endDate.setDate(startDate.getDate() + (goal_cycle_duration * 7));
      } else if (goal_type === 'monthly') {
        endDate.setMonth(startDate.getMonth() + goal_cycle_duration);
      }
      
      calculatedEndDate = endDate.toISOString().split('T')[0];
    }

    // Calculate current cycle dates (all goals are cycling)
    let currentCycleStart = goal_start_date;
    let currentCycleEnd = null;
    
    const startDate = new Date(goal_start_date);
    const cycleEndDate = new Date(startDate);
    
    if (goal_type === 'daily') {
      // For daily goals, each cycle is 1 day long - end at end of start day
      cycleEndDate.setDate(startDate.getDate());
      cycleEndDate.setHours(23, 59, 59, 999); // End of day
      currentCycleEnd = cycleEndDate.toISOString().split('T')[0];
    } else if (goal_type === 'weekly') {
      // Weekly cycle is exactly 7 days long (1 week)
      cycleEndDate.setDate(startDate.getDate() + 6); // 7 days total (0-6)
      currentCycleEnd = cycleEndDate.toISOString().split('T')[0];
    } else if (goal_type === 'monthly') {
      // Monthly cycle is exactly 1 month long
      cycleEndDate.setMonth(startDate.getMonth() + 1);
      cycleEndDate.setDate(cycleEndDate.getDate() - 1);
      currentCycleEnd = cycleEndDate.toISOString().split('T')[0];
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
      goal_end_date: calculatedEndDate || null,
      goal_cycle_duration: goal_cycle_duration === 'forever' ? null : goal_cycle_duration,
      goal_selected_days: goal_selected_days || null,
      current_cycle_start: currentCycleStart,
      current_cycle_end: currentCycleEnd,
      cycles_completed: 0,
      total_cycles: 0,
      created_at: new Date().toISOString(),
      is_completed: false,
      is_active: true
    };

    const query = `
      INSERT INTO goals (
        user_id, goal_name, goal_description, goal_target, goal_progress,
        goal_type, goal_color, goal_icon, goal_start_date, goal_end_date, 
        goal_cycle_duration, goal_selected_days, current_cycle_start,
        current_cycle_end, cycles_completed, total_cycles, created_at, is_completed, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
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
      goal.goal_cycle_duration,
      goal.goal_selected_days || null,
      goal.current_cycle_start,
      goal.current_cycle_end,
      goal.cycles_completed,
      goal.total_cycles,
      goal.created_at,
      goal.is_completed,
      goal.is_active
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