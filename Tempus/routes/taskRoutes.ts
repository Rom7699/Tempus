// Defines routes for task operations (e.g., GET, POST)

import express from 'express';
import {
  addTask,
  getTasks,
  getTasksByDate,
  updateTask,
  deleteTask
} from '../controllers/tasksController';

const router = express.Router();

// Create a new task
router.post('/tasks', addTask);

// // Get all tasks for the authenticated user
// router.get('/tasks', getTasks);

// // Get tasks by date (query param: ?date=YYYY-MM-DD)
// router.get('/tasks/date', getTasksByDate);

// // Update a task by taskId
// router.put('/tasks/:taskId', updateTask);

// // Delete a task by taskId
// router.delete('/tasks/:taskId', deleteTask);

export default router;
