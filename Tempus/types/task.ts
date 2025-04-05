export interface Task {
    userId: string;
    taskId: string;
    taskName: string;
    taskDescription: string;
    creationDate: string; // ISO date-time string, e.g. '2025-04-05T12:30:00Z'
    date: string; // e.g., '2025-04-06'
    time: string; // e.g., '14:00-16:00'
    status: string;
    priority: number; // 1 to 3
    energyLevel: number; // 1 to 100, optional
    dueDate: string; // ISO date format, optional
  }
  