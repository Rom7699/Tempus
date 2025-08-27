// Base goal interface for creating new goals
export interface BaseGoal {
  goal_name: string;
  goal_description: string;
  goal_target: number; // the target number of tasks to complete
  goal_type: 'daily' | 'weekly' | 'monthly';
  goal_color: string;
  goal_icon: string;
  goal_start_date: string; // ISO date format 'YYYY-MM-DD' for when should the goal tracking start
  goal_target_days?: number; // Number of days for the goal duration (null for forever)
  goal_selected_days?: number[]; // Array of selected days (0=Sunday, 1=Monday, ..., 6=Saturday) for daily goals
}

// Full goal interface with server-generated fields
export interface Goal extends BaseGoal {
  goal_id: number;
  goal_progress: number; // how many tasks completed towards the goal target
  created_at: string;
  user_id: string;
  is_completed: boolean;
  completion_date?: string;
  goal_end_date?: string; // Computed end date based on start_date + target_days
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
}