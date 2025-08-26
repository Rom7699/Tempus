// Base goal interface for creating new goals
export interface BaseGoal {
  goal_name: string;
  goal_description: string;
  goal_target: number; // the target number of tasks to complete
  goal_type: 'daily' | 'weekly' | 'monthly';
  goal_color: string;
  goal_icon: string;
  goal_start_date: string; // ISO date format 'YYYY-MM-DD' for when should the goal tracking start
  goal_end_date?: string; // ISO date format 'YYYY-MM-DD' for when the goal tracking ends, if weekly then this is a week from this date, if monthly then this is a month from this date
}

// Full goal interface with server-generated fields
export interface Goal extends BaseGoal {
  goal_id: string;
  goal_progress: number; // how many tasks completed towards the goal target
  created_at: string;
  user_id: string;
  is_completed: boolean;
  completion_date?: string;
}

// Interface for updating goals
export interface UpdateGoalInput {
  goal_id: string;
  goal_name?: string;
  goal_description?: string;
  goal_target?: number;
  goal_progress?: number;
  goal_type?: 'daily' | 'weekly' | 'monthly';
  goal_color?: string;
  goal_icon?: string;
  goal_start_date?: string;
  goal_end_date?: string;
  is_completed?: boolean;
}