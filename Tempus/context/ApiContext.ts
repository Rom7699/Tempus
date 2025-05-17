import axios, { AxiosResponse } from 'axios';
import { AuthService } from '../services/AuthService';
import { BaseTask, Task, UpdateTaskInput } from '../types/tasks';
import { BaseList, List } from '../types/lists';

const apiBase = 'https://0olevx3qah.execute-api.us-east-1.amazonaws.com';

// Function to handle token retrieval and add to request headers
const getAuthHeaders = async (): Promise<{ 'Content-Type': string; 'Authorization': string }> => {
    const token = await AuthService.getJWTToken();
    if (!token) {
        throw new Error('No auth token available');
    }

    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
};


/////////////////////////////////////////////////////////////////////////////////////////////
// Functions to interact with the API
/////////////////////////////////////////////////////////////////////////////////////////////

// Function to create a task
// example ussage: const response = await addTask(taskData);
// where taskData is an object containing the task details.
// the returned data is an object containing the message and the created task, data.data is the created task, data.message is the success message.
  export const addTask = async (taskData: BaseTask): Promise<{ message: string; data: Task }> => {
    const headers = await getAuthHeaders();
    try {
        const { data } = await axios.post<{ message: string; data: Task }>(`${apiBase}/task`, taskData, { headers });
        return data;
      } catch (error: any) {
        console.error('Failed to add task:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to add task');
      }
  };

// Function to delete a task
// example ussage: const response = await deleteTask("task_id_123");
export const deleteTask = async (taskId: string): Promise<{ message: string; data: null }>=> {
    const headers = await getAuthHeaders();
    try {
        const { data } = await axios.delete<{ message: string; data: null }>(
          `${apiBase}/task/${taskId}`,
          { headers }
        );
        console.log(data.message);
        return data;
      } catch (error: any) {
        console.error('Failed to delete task:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to delete task');
      }
  };


// Function to update a task
// example ussage: const response = await updateTask("task_id_123", { task_name: "Updated Task Name", task_description: "Updated description" });   
// Note: The taskId is the ID of the task you want to update, and updatedData is an object containing the fields you want to update.
export const updateTask = async (updatedData: UpdateTaskInput): Promise<{ message: string; data: Task }> => {
    const headers = await getAuthHeaders();
    try {
      const { data } = await axios.patch<{ message: string; data: Task }>(
        `${apiBase}/task/${updatedData.task_id}`,
        updatedData,
        { headers }
      );
      console.log(data.message);
      return data;
    } catch (error: any) {
      console.error('Failed to update task:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to update task');
    }
  };
  

// Get single task by ID
// example ussage: const task = await getTaskById("task_id_123");
export const getTaskById = async (taskId: string): Promise<{ message: string; data: Task }> => {
    const headers = await getAuthHeaders();
    try {
      const { data } = await axios.get<{ message: string; data: Task }>(
        `${apiBase}/task/${taskId}`,
        { headers }
      );
      console.log(data.message);
      return data;
    } catch (error: any) {
      console.error('Failed to fetch task:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch task');
    }
  };
  

// Get tasks by specific day (YYYY-MM-DD)
// example ussage: const tasksToday = await getTasksByDay("2025-05-04");
export const getTasksByDay = async (date: string): Promise<{ message: string; data: Task[] }> => {
    const headers = await getAuthHeaders();
    try {
      const { data } = await axios.get<{ message: string; data: Task[] }>(
        `${apiBase}/tasks/day/${date}`,
        { headers }
      );
      console.log(data.message);
      return data;
    } catch (error: any) {
      console.error('Failed to fetch tasks:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch tasks');
    }
  };
  

// Get tasks by specific month (YYYY-MM)
// example ussage: const tasksInMay = await getTasksByMonth(2025, 5);
// export const getTasksByMonth = async (month: number, year: number): Promise<AxiosResponse<Task[]>> => {
//     const headers = await getAuthHeaders();
//     return axios.get(`${apiBase}/tasks/month/${month}/${year}`, { headers });
// };
export const getTasksByMonth = async (
    month: number,
    year: number
  ): Promise<{ message: string; data: Task[] }> => {
    const headers = await getAuthHeaders();
    try {
      const { data } = await axios.get<{ message: string; data: Task[] }>(
        `${apiBase}/tasks/month/${month}/${year}`,
        { headers }
      );
      console.log(data.message);
      return data;
    } catch (error: any) {
      console.error('Failed to fetch tasks by month:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch tasks by month');
    }
  };
  
// Get tasks by year
// example ussage: const tasksInYear = await getTasksByYear(2025);
export const getTasksByYear = async (
    year: number
  ): Promise<{ message: string; data: Task[] }> => {
    const headers = await getAuthHeaders();
    try {
      const { data } = await axios.get<{ message: string; data: Task[] }>(
        `${apiBase}/tasks/year/${year}`,
        { headers }
      );
      console.log(data.message);
      return data;
    } catch (error: any) {
      console.error('Failed to fetch tasks by year:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch tasks by year');
    }
  };
  

// Add a new list
// example ussage:const response = await addList({ name: "Work", color: "#FF0000", icon: "work" });
export const addList = async (listData: BaseList): Promise<{ message: string; data: List }> => {
    const headers = await getAuthHeaders();
    try {
      const { data } = await axios.post<{ message: string; data: List }>(
        `${apiBase}/list`,
        listData,
        { headers }
      );
      console.log(data.message);
      return data;
    } catch (error: any) {
      console.error('Failed to add list:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to add list');
    }
  };
  

// Get all user's lists
// example ussage: const lists = await getLists();
export const getLists = async (): Promise<{ message: string; data: List[] }> => {
    const headers = await getAuthHeaders();
    try {
      const { data } = await axios.get<{ message: string; data: List[] }>(
        `${apiBase}/lists`,
        { headers }
      );
      console.log(data.message);
      return data;
    } catch (error: any) {
      console.error('Failed to fetch lists:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch lists');
    }
  };
  
  

  // Get tasks by list ID
// example ussage: const tasks = await getTasksByListId(1);
  export const getTasksByListId = async (listId: number): Promise<{ message: string; data: Task[] }> => {
    const headers = await getAuthHeaders();
    try {
      const { data } = await axios.get<{ message: string; data: Task[] }>(
        `${apiBase}/tasks/list/${listId}`,
        { headers }
      );
      console.log(data.message);
      return data;
    } catch (error: any) {
      console.error('Failed to fetch tasks by list ID:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch tasks by list ID');
    }
  };
  
