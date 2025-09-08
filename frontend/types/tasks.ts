export interface BaseTask {
  // Task content
  task_name: string;
  task_description?: string;
  task_list_id?: number;
  task_goal_id?: number;

  // Timing information
  task_start_date: string; // ISO date format 'YYYY-MM-DD'
  task_start_time: string; // Format 'HH:MM'
  task_end_date: string; // ISO date format 'YYYY-MM-DD'
  task_end_time: string; // Format 'HH:MM'

  // Additional properties
  task_reminder?: boolean;
  task_location?: string;
  task_attendees?: string[];
  task_priority?: number; // 1-low, 2-medium, 3-high
  task_energy_level?: number;

  is_ai_generated?: boolean;
  is_event?: boolean;
  is_completed?: boolean; // Nullable to allow for uninitialized state
}

export interface UpdateTaskInput extends Partial<BaseTask> {
  task_id: string; // explicitly required
}

export interface Task extends UpdateTaskInput {
  user_id?: string;
  task_creation_date?: string;
}

// AI Task Generator Types
export interface AITaskInput {
  name: string;
  energy_demand: string; // EnergyDemand type from Lambda
  frequency: number; // occurrences this week
  duration_minutes: number; // per occurrence
  notes?: string; // optional per-task constraints/instructions
}

// Lambda response type - matches exact Lambda output format
export interface AIGeneratedTask {
  task_name: string;
  task_day: string;
  task_description: string; // Why this slot fits (reference health data/notes when relevant)
  task_start_date: string; // <YYYY-MM-DD>
  task_end_date: string; // <YYYY-MM-DD>
  task_start_time: string; // "15:00:00"
  task_end_time: string; // "19:00:00"
  task_energy_level: number; // 75
  task_duration_minutes: number; // 240
}

// UI state for reviewing and selecting tasks
export interface AITaskForReview extends AIGeneratedTask {
  isSelected?: boolean;
  task_message?: string; // User feedback for rescheduling
  temp_id?: string; // Temporary unique identifier for tracking
}
