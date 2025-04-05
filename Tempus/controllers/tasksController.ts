// Contains DynamoDB operations (e.g., add, query tasks)

import { v4 as uuidv4 } from 'uuid'; // Make sure to install this: npm install uuid
import { Request, Response } from 'express';
import { Task } from '../types/task';
import * as TaskDB from '../services/dynamoService';
import { useAuth } from '../context/AuthContext';

const validStatuses = ['pending', 'in-progress', 'done'];

// Creating a new task for the authenticated user
export const addTask = async (req: Request, res: Response) => {
  try {
    const { user } = useAuth(); // Get the current user from the context
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const {
        taskName,
        taskDescription,
        date,
        time,
        status,
        priority,
        energyLevel,
        dueDate
      } = req.body;

      // Validate required fields
    if (!taskName || !taskDescription || !date || !time || !status || !priority) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Validate status
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }

      // Generate energyLevel if not provided TODO: let ai calc this
    const finalEnergyLevel = energyLevel !== undefined
    ? energyLevel
    : Math.floor(Math.random() * 41) + 40; // Random value between 40–80
  
      // Build a Task object
      const taskData: Task = {
        userId: user.getUsername(),
        taskId: uuidv4(),
        taskName,
        taskDescription,
        creationDate: new Date().toISOString(),
        date,
        time,
        status,
        priority,
        energyLevel: finalEnergyLevel,
        dueDate
      };

      if (dueDate) {
        taskData.dueDate = dueDate;
      }

    await TaskDB.addTask(taskData); // add task to database
    res.status(201).json({ message: 'Task created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating task', error });
  }
};

// Fetching tasks for the authenticated user
export const getTasks = async (req: Request, res: Response) => {
  try {
    const { user } = useAuth();
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const tasks = await TaskDB.getTasks(user.getUsername()); // Pass userId
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks', error });
  }
};


export const getTasksByDate = async (req: Request, res: Response) => {
    try {
      const { user } = useAuth();
      if (!user) return res.status(401).json({ message: 'Not authenticated' });
  
      const { date } = req.query;
      if (!date) return res.status(400).json({ message: 'Missing date parameter' });
  
      const tasks = await TaskDB.getTasksByDate(user.getUsername(), date as string);
      res.status(200).json(tasks);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching tasks by date', error });
    }
  };
  
  // update task by taksId
  export const updateTask = async (req: Request, res: Response) => {
    try {
      const { user } = useAuth();
      if (!user) return res.status(401).json({ message: 'Not authenticated' });
  
      const { taskId } = req.params;
      const updates = req.body;
  
      const updatedTask = await TaskDB.updateTask(user.getUsername(), taskId, updates);
      res.status(200).json(updatedTask);
    } catch (error) {
      res.status(500).json({ message: 'Error updating task', error });
    }
  };
  
  // delete a task
  export const deleteTask = async (req: Request, res: Response) => {
    try {
      const { user } = useAuth();
      if (!user) return res.status(401).json({ message: 'Not authenticated' });
  
      const { taskId } = req.params;
      await TaskDB.deleteTask(user.getUsername(), taskId);
      res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting task', error });
    }
  };
  