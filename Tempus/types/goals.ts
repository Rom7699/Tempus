// Base goal interface for creating new goals
export interface BaseGoal {
  goal_name: string;
  goal_description: string;
  goal_target: number; // the target number of tasks to complete
  goal_type: 'daily' | 'weekly' | 'monthly';
  goal_color: string;
  goal_icon: string;
  goal_start_date: string; // ISO date format 'YYYY-MM-DD' for when should the goal tracking start
  goal_end_date?: string; // Optional end date for the goal
  goal_cycle_duration?: number; // Duration of each cycle (null for forever), for daily means days, for weekly/monthly means number of weeks/months
  goal_selected_days?: number[]; // Array of selected days (0=Sunday, 1=Monday, ..., 6=Saturday) for daily goals
  is_cycling?: boolean; // Whether the goal should reset automatically
}

// Full goal interface with server-generated fields
export interface Goal extends BaseGoal {
  goal_id: number;
  goal_progress: number; // how many tasks completed towards the goal target
  created_at: string;
  user_id: string;
  is_completed: boolean;
  is_active: boolean; // Whether the goal is still active (false if past end date)
  completion_date?: string;
  goal_end_date?: string; // Computed end date based on start_date + cycle_duration
  current_cycle_start?: string; // When the current cycle started
  current_cycle_end?: string; // When the current cycle ends
  cycles_completed?: number; // Number of cycles where target was achieved
  total_cycles?: number; // Total number of cycles that have elapsed
}

// Interface for updating goals
export interface UpdateGoalInput {
  goal_id: number;
  goal_name?: string;
  goal_description?: string;
  goal_target?: number;
  goal_progress?: number;
  goal_type?: 'daily' | 'weekly' | 'monthly';
  goal_color?: string;
  goal_icon?: string;
  goal_start_date?: string;
  goal_end_date?: string;
  goal_selected_days?: number[];
  is_completed?: boolean;
  is_active?: boolean;
  is_cycling?: boolean;
  current_cycle_start?: string;
  current_cycle_end?: string;
  cycles_completed?: number;
  total_cycles?: number;
}