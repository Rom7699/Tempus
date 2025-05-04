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
export const addTask = async (taskData: BaseTask): Promise<AxiosResponse<any>> => {
    const headers = await getAuthHeaders();
    return axios.post(`${apiBase}/task`, taskData, { headers });
};

// Function to delete a task
// example ussage: const response = await deleteTask("task_id_123");
export const deleteTask = async (taskId: string): Promise<AxiosResponse<any>> => {
    const headers = await getAuthHeaders();
    return axios.delete(`${apiBase}/task/${taskId}`, { headers });
};


// Function to update a task
// example ussage: const response = await updateTask("task_id_123", { task_name: "Updated Task Name", task_description: "Updated description" });   
// Note: The taskId is the ID of the task you want to update, and updatedData is an object containing the fields you want to update.
export const updateTask = async (updatedData: UpdateTaskInput): Promise<AxiosResponse<any>> => {
    const headers = await getAuthHeaders();
    return axios.patch(`${apiBase}/task/${updatedData.task_id}`, updatedData, { headers });
};

// Get single task by ID
// example ussage: const task = await getTaskById("task_id_123");
export const getTaskById = async (taskId: string): Promise<AxiosResponse<Task>> => {
    const headers = await getAuthHeaders();
    return axios.get(`${apiBase}/task/${taskId}`, { headers });
};

// Get tasks by specific day (YYYY-MM-DD)
// example ussage: const tasksToday = await getTasksByDay("2025-05-04");
export const getTasksByDay = async (date: string): Promise<AxiosResponse<Task[]>> => {
    const headers = await getAuthHeaders();
    return axios.get(`${apiBase}/tasks/day/${date}`, { headers });
};

// Get tasks by specific month (YYYY-MM)
// example ussage: const tasksInMay = await getTasksByMonth(2025, 5);
export const getTasksByMonth = async (month: number, year: number): Promise<AxiosResponse<Task[]>> => {
    const headers = await getAuthHeaders();
    return axios.get(`${apiBase}/tasks/month/${month}/${year}`, { headers });
};

// Get tasks by year
// example ussage: const tasksInYear = await getTasksByYear(2025);
export const getTasksByYear = async (year: number): Promise<AxiosResponse<Task[]>> => {
    const headers = await getAuthHeaders();
    return axios.get(`${apiBase}/tasks/year/${year}`, { headers });
};

// Add a new list
// example ussage:const response = await addList({ name: "Work", color: "#FF0000", icon: "work" });
export const addList = async (listData: BaseList): Promise<AxiosResponse<any>> => {
    const headers = await getAuthHeaders();
    return axios.post(`${apiBase}/list`, listData, { headers });
};

// Get all user's lists
// example ussage: const lists = await getLists();
export const getLists = async (): Promise<AxiosResponse<List[]>> => {
    const headers = await getAuthHeaders();
    return axios.get(`${apiBase}/lists`, { headers });
};
