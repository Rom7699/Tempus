// Utility function to check and reset a goal's cycle if needed
const checkAndResetGoalCycle = async (pool, goal) => {
  // Check if goal should be marked as inactive (past end date)
  if (goal.goal_end_date && goal.is_active !== false) {
    const today = new Date();
    const endDate = new Date(goal.goal_end_date);
    endDate.setHours(23, 59, 59, 999); // End of end date
    
    if (today > endDate) {
      console.log(`[CheckGoalCycle] Deactivating goal ${goal.goal_id} (${goal.goal_name}) - past end date`);
      const deactivateQuery = `
        UPDATE goals 
        SET is_active = false
        WHERE goal_id = $1
        RETURNING *
      `;
      
      const result = await pool.query(deactivateQuery, [goal.goal_id]);
      goal = result.rows[0]; // Update the goal object
    }
  }

  if (!goal.current_cycle_end) {
    return goal; // No cycle end date, return as-is
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const cycleEndDate = new Date(goal.current_cycle_end);
  const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, etc.

  // Check if the current cycle has ended
  let shouldReset = false;
  let newCycleStart = todayStr;
  let newCycleEnd = null;

  if (goal.goal_type === 'daily') {
    // For daily goals, only reset if it's a new selected day after the current cycle ended
    const selectedDays = goal.goal_selected_days || [0,1,2,3,4,5,6]; // Default to all days
    const currentCycleStartStr = goal.current_cycle_start;
    
    // Check if today is a selected day and it's different from current cycle start
    if (selectedDays.includes(dayOfWeek) && currentCycleStartStr !== todayStr) {
      // Only reset if we've actually passed the cycle end (completed the previous day)
      if (today > cycleEndDate) {
        shouldReset = true;
        newCycleStart = todayStr;
        const todayEndDate = new Date(today);
        todayEndDate.setHours(23, 59, 59, 999); // End of day
        newCycleEnd = todayEndDate.toISOString().split('T')[0];
      }
    }
    
  } else if (goal.goal_type === 'weekly') {
    // Weekly goals reset if we've passed the cycle end date
    if (today > cycleEndDate) {
      shouldReset = true;
      
      // Calculate new weekly cycle - each cycle is exactly 7 days
      const startDate = new Date(goal.goal_start_date);
      const completedCycles = (goal.cycles_completed || 0) + 1;
      
      const cycleStartDate = new Date(startDate);
      cycleStartDate.setDate(startDate.getDate() + (completedCycles * 7)); // Each cycle is 7 days
      
      const cycleEndDate = new Date(cycleStartDate);
      cycleEndDate.setDate(cycleStartDate.getDate() + 6); // 7 days total (0-6)
      
      newCycleStart = cycleStartDate.toISOString().split('T')[0];
      newCycleEnd = cycleEndDate.toISOString().split('T')[0];
    }
    
  } else if (goal.goal_type === 'monthly') {
    // Monthly goals reset if we've passed the cycle end date
    if (today > cycleEndDate) {
      shouldReset = true;
      
      // Calculate new monthly cycle - each cycle is exactly 1 month
      const startDate = new Date(goal.goal_start_date);
      const completedCycles = (goal.cycles_completed || 0) + 1;
      
      const cycleStartDate = new Date(startDate);
      cycleStartDate.setMonth(startDate.getMonth() + completedCycles); // Each cycle is 1 month
      
      const cycleEndDate = new Date(cycleStartDate);
      cycleEndDate.setMonth(cycleEndDate.getMonth() + 1);
      cycleEndDate.setDate(cycleEndDate.getDate() - 1);
      
      newCycleStart = cycleStartDate.toISOString().split('T')[0];
      newCycleEnd = cycleEndDate.toISOString().split('T')[0];
    }
  }

  if (shouldReset) {
    console.log(`[CheckGoalCycle] Resetting goal ${goal.goal_id} (${goal.goal_name})`);
    
    // Check if the previous cycle was successful (target met)
    const wasSuccessful = goal.goal_progress >= goal.goal_target;
    
    // Reset the goal progress and update cycle dates
    const updateQuery = `
      UPDATE goals 
      SET goal_progress = 0,
          current_cycle_start = $2,
          current_cycle_end = $3,
          cycles_completed = COALESCE(cycles_completed, 0) + $4,
          total_cycles = COALESCE(total_cycles, 0) + 1,
          is_completed = false
      WHERE goal_id = $1
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [
      goal.goal_id,
      newCycleStart,
      newCycleEnd,
      wasSuccessful ? 1 : 0 // Only increment cycles_completed if target was met
    ]);
    
    console.log(`[CheckGoalCycle] Successfully reset goal ${goal.goal_id} - Previous cycle ${wasSuccessful ? 'successful' : 'unsuccessful'}`);
    return result.rows[0]; // Return the updated goal
  }

  return goal; // No reset needed
};

module.exports = { checkAndResetGoalCycle };