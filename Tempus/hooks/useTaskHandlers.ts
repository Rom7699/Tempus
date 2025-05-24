// hooks/useTaskHandlers.ts
import { useState } from 'react';
import { useApi } from '@/context/ApiContext';
import { Task, BaseTask } from '@/types/tasks';

export const useTaskHandlers = (onTaskChange?: () => void) => {
  const { addTask, deleteTask, updateTask, refreshTasks } = useApi();
  
  const [taskModalVisible, setTaskModalVisible] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const handleTaskPress = (task: Task) => {
    setSelectedTask(task);
    setTaskModalVisible(true);
  };

  const handleEditTask = (task: Task) => {
    console.log("Edit task:", task);
    setTaskModalVisible(false);
    // Additional edit logic here
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      if (onTaskChange) onTaskChange();
      setTaskModalVisible(false);
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const handleToggleTaskCompletion = async (task: Task, isCompleted: boolean) => {
    try {
      const updateData = {
        task_id: task.task_id,
        is_completed: isCompleted,
        task_completed_date: isCompleted ? new Date().toISOString() : undefined
      };
      
      await updateTask(updateData);
      if (onTaskChange) onTaskChange();
    } catch (error) {
      console.error("Failed to update task completion:", error);
    }
  };

  const handleAddTask = async (taskData: BaseTask) => {
    try {
      await addTask(taskData);
      if (onTaskChange) onTaskChange();
      return true;
    } catch (error) {
      console.error("Error adding task:", error);
      return false;
    }
  };

  return {
    taskModalVisible,
    selectedTask,
    handleTaskPress,
    handleEditTask,
    handleDeleteTask,
    handleToggleTaskCompletion,
    handleAddTask,
    setTaskModalVisible,
  };
};