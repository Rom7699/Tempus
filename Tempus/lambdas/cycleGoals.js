const { getPool } = require('/opt/nodejs/db');

exports.handler = async (event) => {
  try {
    const pool = getPool();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, etc.
    
    console.log(`[CycleGoals] Checking for goals to cycle on ${todayStr}, day of week: ${dayOfWeek}`);

    // Get all cycling goals that might need to be reset
    const goalsQuery = `
      SELECT * FROM goals 
      WHERE is_cycling = true 
      AND is_completed = false
      AND current_cycle_end IS NOT NULL
      AND current_cycle_end < $1
    `;
    
    const goalsResult = await pool.query(goalsQuery, [todayStr]);
    const goalsToReset = goalsResult.rows;
    
    console.log(`[CycleGoals] Found ${goalsToReset.length} goals to potentially reset`);

    for (const goal of goalsToReset) {
      let shouldReset = false;
      let newCycleStart = todayStr;
      let newCycleEnd = null;
      
      // Calculate next cycle dates based on goal type
      if (goal.goal_type === 'daily') {
        // For daily goals, check if today is in the selected days
        const selectedDays = goal.goal_selected_days || [0,1,2,3,4,5,6]; // Default to all days
        shouldReset = selectedDays.includes(dayOfWeek);
        newCycleEnd = todayStr; // Daily cycle ends same day
        
      } else if (goal.goal_type === 'weekly') {
        // Weekly goals reset every 7 days from start date
        const startDate = new Date(goal.goal_start_date);
        const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
        const weekNumber = Math.floor(daysSinceStart / 7) + 1;
        
        // Calculate new cycle dates
        const cycleStartDate = new Date(startDate);
        cycleStartDate.setDate(startDate.getDate() + (weekNumber * 7));
        
        const cycleEndDate = new Date(cycleStartDate);
        cycleEndDate.setDate(cycleStartDate.getDate() + 6);
        
        newCycleStart = cycleStartDate.toISOString().split('T')[0];
        newCycleEnd = cycleEndDate.toISOString().split('T')[0];
        shouldReset = true;
        
      } else if (goal.goal_type === 'monthly') {
        // Monthly goals reset on the same day of each month
        const startDate = new Date(goal.goal_start_date);
        const nextMonthStart = new Date(today.getFullYear(), today.getMonth(), startDate.getDate());
        
        // If we've passed the start day this month, move to next month
        if (today.getDate() >= startDate.getDate()) {
          nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);
        }
        
        const nextMonthEnd = new Date(nextMonthStart);
        nextMonthEnd.setMonth(nextMonthEnd.getMonth() + 1);
        nextMonthEnd.setDate(nextMonthEnd.getDate() - 1);
        
        newCycleStart = nextMonthStart.toISOString().split('T')[0];
        newCycleEnd = nextMonthEnd.toISOString().split('T')[0];
        shouldReset = true;
      }

      if (shouldReset) {
        console.log(`[CycleGoals] Resetting goal ${goal.goal_id} (${goal.goal_name})`);
        
        // Reset the goal progress and update cycle dates
        const updateQuery = `
          UPDATE goals 
          SET goal_progress = 0,
              current_cycle_start = $2,
              current_cycle_end = $3,
              cycles_completed = cycles_completed + 1,
              is_completed = false
          WHERE goal_id = $1
        `;
        
        await pool.query(updateQuery, [
          goal.goal_id,
          newCycleStart,
          newCycleEnd
        ]);
        
        console.log(`[CycleGoals] Successfully reset goal ${goal.goal_id}`);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Goal cycling completed successfully',
        goalsProcessed: goalsToReset.length
      })
    };

  } catch (error) {
    console.error('[CycleGoals] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error processing goal cycles',
        error: error.message
      })
    };
  }
};