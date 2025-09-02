// Utility function to check and reset a goal's cycle if needed
const checkAndResetGoalCycle = async (pool, goal) => {
  if (!goal.is_cycling || !goal.current_cycle_end) {
    return goal; // Not a cycling goal, return as-is
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
    // For daily goals, reset if we've passed the cycle end and today is a selected day
    const selectedDays = goal.goal_selected_days || [0,1,2,3,4,5,6]; // Default to all days
    const needsReset = today > cycleEndDate && selectedDays.includes(dayOfWeek);
    
    if (needsReset) {
      shouldReset = true;
      // Set new cycle to today (start) and end of today (end)
      newCycleStart = todayStr;
      const todayEndDate = new Date(today);
      todayEndDate.setHours(23, 59, 59, 999); // End of day
      newCycleEnd = todayEndDate.toISOString().split('T')[0];
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
    
    // Reset the goal progress and update cycle dates
    const updateQuery = `
      UPDATE goals 
      SET goal_progress = 0,
          current_cycle_start = $2,
          current_cycle_end = $3,
          cycles_completed = COALESCE(cycles_completed, 0) + 1,
          is_completed = false
      WHERE goal_id = $1
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [
      goal.goal_id,
      newCycleStart,
      newCycleEnd
    ]);
    
    console.log(`[CheckGoalCycle] Successfully reset goal ${goal.goal_id}`);
    return result.rows[0]; // Return the updated goal
  }

  return goal; // No reset needed
};

module.exports = { checkAndResetGoalCycle };