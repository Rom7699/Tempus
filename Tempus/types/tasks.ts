
export interface BaseTask {
    // Task content
    task_name: string;
    task_description?: string;
    task_list_id?: number;

    // Timing information
    task_start_date?: string; // ISO date format 'YYYY-MM-DD'
    task_start_time?: string; // Format 'HH:MM:SS'
    task_end_date?: string; // ISO date format 'YYYY-MM-DD'
    task_end_time?: string; // Format 'HH:MM:SS'

    // Additional properties
    task_reminder?: boolean;
    task_location?: string;
    task_attendees?: string[];
    task_priority?: number;
    task_energy_level?: number;

}

export interface CreateTaskInput extends BaseTask { }
export interface UpdateTaskInput extends Partial<BaseTask> {
    task_id: string; // explicitly required
}


export interface Task extends UpdateTaskInput {
    user_id?: string;
    task_creation_date?: string;
}
