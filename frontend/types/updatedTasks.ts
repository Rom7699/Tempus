// types/taskValidation.ts
import { z } from 'zod';
import { BaseTask, Task, UpdateTaskInput } from './tasks';

// Zod schema that matches your BaseTask interface
export const baseTaskSchema = z.object({
  // Task content
  task_name: z.string()
    .min(1, 'Task name is required')
    .max(200, 'Task name must be less than 200 characters'),
  
  task_description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  
  task_list_id: z.number().positive().optional(),

  // Timing information
  task_start_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  
  task_start_time: z.string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  
  task_end_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  
  task_end_time: z.string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),

  // Additional properties
  task_reminder: z.boolean().optional(),
  
  task_location: z.string()
    .max(300, 'Location must be less than 300 characters')
    .optional(),
  
  task_attendees: z.array(z.string()).optional(),
  
  task_priority: z.number()
    .min(1, 'Priority must be between 1 and 3')
    .max(3, 'Priority must be between 1 and 3')
    .optional(),
  
  task_energy_level: z.number()
    .min(0, 'Energy level must be between 0 and 100')
    .max(100, 'Energy level must be between 0 and 100')
    .optional(),

  is_ai_generated: z.boolean().optional(),
  is_event: z.boolean().optional(),
  is_completed: z.boolean().optional(),
});

// Add date validation refinement
export const baseTaskSchemaWithValidation = baseTaskSchema.refine(
  (data) => {
    const startDateTime = new Date(`${data.task_start_date}T${data.task_start_time}`);
    const endDateTime = new Date(`${data.task_end_date}T${data.task_end_time}`);
    return endDateTime > startDateTime;
  },
  {
    message: "End date and time must be after start date and time",
    path: ["task_end_date"],
  }
);

// Schema for updating tasks
export const updateTaskSchema = baseTaskSchema.partial().extend({
  task_id: z.string().min(1, 'Task ID is required'),
});

// Schema for complete task (with user_id, creation_date, etc.)
export const taskSchema = updateTaskSchema.extend({
  user_id: z.string().optional(),
  task_creation_date: z.string().optional(),
});