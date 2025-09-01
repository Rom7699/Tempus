import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import axios, { AxiosResponse } from "axios";
import { AuthService } from "../services/AuthService";
import { BaseTask, Task, UpdateTaskInput } from "../types/tasks";
import { BaseList, List } from "../types/lists";
import { BaseGoal, Goal, UpdateGoalInput } from "../types/goals";

const apiBase = "https://b1s33elek9.execute-api.us-east-1.amazonaws.com";

// Define the shape of our context
interface ApiContextType {
  // Tasks
  tasks: Task[];
  taskLoading: boolean;
  taskError: string | null;
  addTask: (taskData: BaseTask) => Promise<AxiosResponse<any>>;
  deleteTask: (taskId: string) => Promise<AxiosResponse<any>>;
  updateTask: (updatedData: UpdateTaskInput) => Promise<AxiosResponse<any>>;
  getTaskById: (taskId: string) => Promise<AxiosResponse<Task>>;
  getTasksByDay: (
    date: string
  ) => Promise<{ message: string; tasksArr: Task[] }>;
  getTasksByMonth: (
    month: number,
    year: number
  ) => Promise<{ message: string; tasksArr: Task[] }>;
  getTasksByYear: (
    year: number
  ) => Promise<{ message: string; tasksArr: Task[] }>;
  getTasksByListId: (
    listId: number
  ) => Promise<{ message: string; tasksArr: Task[] }>;
  getTasksByGoalId: (
    goalId: number
  ) => Promise<{ message: string; tasksArr: Task[] }>;

  // Lists
  lists: List[];
  listLoading: boolean;
  listError: string | null;
  addList: (listData: BaseList) => Promise<AxiosResponse<any>>;
  updateList: (listId: string, updateData: Partial<BaseList>) => Promise<AxiosResponse<any>>;
  deleteList: (listId: string) => Promise<AxiosResponse<any>>;
  unlinkAllTasksFromList: (listId: string) => Promise<AxiosResponse<any>>;
  getLists: () => Promise<{ message: string; listsArr: List[] }>;

  // Goals
  goals: Goal[];
  goalLoading: boolean;
  goalError: string | null;
  addGoal: (goalData: BaseGoal) => Promise<AxiosResponse<any>>;
  updateGoal: (updatedData: UpdateGoalInput) => Promise<AxiosResponse<any>>;
  deleteGoal: (goalId: number) => Promise<AxiosResponse<any>>;
  getGoals: (goal_type?: 'daily' | 'weekly' | 'monthly', is_completed?: boolean) => Promise<{ message: string; goals: Goal[] }>;
  getGoalById: (goalId: number) => Promise<{ message: string; goal: Goal }>;
  getGoalProgress: (goalId: number) => Promise<{ message: string; data: any }>;
  linkTaskToGoal: (taskId: string, goalId: number) => Promise<AxiosResponse<any>>;
  unlinkTaskFromGoal: (taskId: string) => Promise<AxiosResponse<any>>;

  // Refresh functions to update state
  refreshTasks: (month?: number, year?: number) => Promise<void>;
  refreshLists: () => Promise<void>;
  refreshGoals: () => Promise<void>;
}

// Create the context with a default value
const ApiContext = createContext<ApiContextType | undefined>(undefined);

// Function to handle token retrieval and add to request headers
const getAuthHeaders = async (): Promise<{
  "Content-Type": string;
  Authorization: string;
}> => {
  const token = await AuthService.getJWTToken();
  if (!token) {
    throw new Error("No auth token available");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

// Provider component
interface ApiProviderProps {
  children: ReactNode;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ children }) => {
  // State for tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskLoading, setTaskLoading] = useState<boolean>(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  // State for lists
  const [lists, setLists] = useState<List[]>([]);
  const [listLoading, setListLoading] = useState<boolean>(false);
  const [listError, setListError] = useState<string | null>(null);

  // State for goals
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalLoading, setGoalLoading] = useState<boolean>(false);
  const [goalError, setGoalError] = useState<string | null>(null);

  // Function to refresh tasks
  const refreshTasks = useCallback(async (month?: number, year?: number) => {
    setTaskLoading(true);
    setTaskError(null);

    try {
      // If month and year are provided, get tasks for that month
      // Otherwise, get tasks for the current month
      const currentDate = new Date();
      const m = month || currentDate.getMonth() + 1;
      const y = year || currentDate.getFullYear();
      const response = await getTasksByMonthImpl(m, y);
      setTasks(response.tasksArr);
      console.log("Tasks refreshed successfully for month:", m, "year:", y);
    } catch (error: any) {
      setTaskError(error.message || "Error fetching tasks");
      console.error("Error refreshing tasks:", error);
    } finally {
      setTaskLoading(false);
    }
  }, []);

  // Function to refresh lists
  const refreshLists = useCallback(async () => {
    setListLoading(true);
    setListError(null);

    try {
      const response = await getListsImpl();
      setLists(response.listsArr);
    } catch (error: any) {
      setListError(error.message || "Error fetching lists");
      console.error("Error refreshing lists:", error);
    } finally {
      setListLoading(false);
    }
  }, []);

  // Function to refresh goals
  const refreshGoals = useCallback(async () => {
    setGoalLoading(true);
    setGoalError(null);

    try {
      const response = await getGoalsImpl();
      setGoals(response.goals);
    } catch (error: any) {
      setGoalError(error.message || "Error fetching goals");
      console.error("Error refreshing goals:", error);
    } finally {
      setGoalLoading(false);
    }
  }, []);

  // Implementation of API functions
  // Tasks
  const addTaskImpl = async (
    taskData: BaseTask
  ): Promise<AxiosResponse<any>> => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(`${apiBase}/task`, taskData, { headers });
      console.log("Task added successfully");
      return response;
    } catch (error: any) {
      console.error("Error adding task:", error);
      throw new Error(error.response?.data?.message || "Failed to add task");
    }
  };

  const deleteTaskImpl = async (
    taskId: string
  ): Promise<AxiosResponse<any>> => {
    const headers = await getAuthHeaders();
    const response = await axios.delete(`${apiBase}/task/${taskId}`, {
      headers,
    });
    return response;
  };

  const updateTaskImpl = async (
    updatedData: UpdateTaskInput
  ): Promise<AxiosResponse<any>> => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.patch(
        `${apiBase}/task/${updatedData.task_id}`,
        updatedData,
        { headers }
      );
      // After updating a task, refresh the task list
      await refreshTasks();
      return response;
    } catch (error: any) {
      console.error(
        "Failed to update task:",
        error.response?.data || error.message
      );
      throw new Error(error.response?.data?.message || "Failed to update task");
    }
  };

  const getTaskByIdImpl = async (
    taskId: string
  ): Promise<AxiosResponse<Task>> => {
    const headers = await getAuthHeaders();
    return axios.get(`${apiBase}/task/${taskId}`, { headers });
  };

  const getTasksByDayImpl = async (
    date: string
  ): Promise<{ message: string; tasksArr: Task[] }> => {
    const headers = await getAuthHeaders();
    try {
      const { data } = await axios.get<{ message: string; tasksArr: Task[] }>(
        `${apiBase}/tasks/day/${date}`,
        { headers }
      );
      return data;
    } catch (error: any) {
      console.error(
        "Failed to fetch tasks:",
        error.response?.data || error.message
      );
      throw new Error(error.response?.data?.message || "Failed to fetch tasks");
    }
  };

  const getTasksByMonthImpl = async (
    month: number,
    year: number
  ): Promise<{ message: string; tasksArr: Task[] }> => {
    const headers = await getAuthHeaders();
    try {
      const { data } = await axios.get<{ message: string; tasksArr: Task[] }>(
        `${apiBase}/tasks/month/${month}/${year}`,
        { headers }
      );
      return data;
    } catch (error: any) {
      console.error(
        "Failed to fetch tasks by month:",
        error.response?.data || error.message
      );
      throw new Error(
        error.response?.data?.message || "Failed to fetch tasks by month"
      );
    }
  };

  const getTasksByYearImpl = async (
    year: number
  ): Promise<{ message: string; tasksArr: Task[] }> => {
    const headers = await getAuthHeaders();
    try {
      const { data } = await axios.get<{ message: string; tasksArr: Task[] }>(
        `${apiBase}/tasks/year/${year}`,
        { headers }
      );
      return data;
    } catch (error: any) {
      console.error(
        "Failed to fetch tasks by year:",
        error.response?.data || error.message
      );
      throw new Error(
        error.response?.data?.message || "Failed to fetch tasks by year"
      );
    }
  };

  // New function to get tasks by list ID
  const getTasksByListIdImpl = async (
    listId: number
  ): Promise<{ message: string; tasksArr: Task[] }> => {
    const headers = await getAuthHeaders();
    try {
      const { data } = await axios.get<{ message: string; tasksArr: Task[] }>(
        `${apiBase}/tasks/list/${listId}`,
        { headers }
      );
      return data;
    } catch (error: any) {
      console.error(
        "Failed to fetch tasks by list ID:",
        error.response?.data || error.message
      );
      throw new Error(
        error.response?.data?.message || "Failed to fetch tasks by list ID"
      );
    }
  };

  // New function to get tasks by goal ID
  const getTasksByGoalIdImpl = async (
    goalId: number
  ): Promise<{ message: string; tasksArr: Task[] }> => {
    const headers = await getAuthHeaders();
    try {
      const { data } = await axios.get<{ message: string; tasksArr: Task[] }>(
        `${apiBase}/tasks/goal/${goalId}`,
        { headers }
      );
      return data;
    } catch (error: any) {
      console.error(
        "Failed to fetch tasks by goal ID:",
        error.response?.data || error.message
      );
      throw new Error(
        error.response?.data?.message || "Failed to fetch tasks by goal ID"
      );
    }
  };

  // Lists
  const addListImpl = async (
    listData: BaseList
  ): Promise<AxiosResponse<any>> => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(`${apiBase}/list`, listData, {
        headers,
      });
      // After adding a list, refresh the list
      await refreshLists();
      return response;
    } catch (error: any) {
      console.error(
        "Failed to add list:",
        error.response?.data || error.message
      );
      throw new Error(error.response?.data?.message || "Failed to add list");
    }
  };

  const updateListImpl = async (
    listId: string,
    updateData: Partial<BaseList>
  ): Promise<AxiosResponse<any>> => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.put(`${apiBase}/list/${listId}`, updateData, { headers });
      console.log("List updated successfully");
      // After updating a list, refresh the list
      await refreshLists();
      return response;
    } catch (error: any) {
      console.error("Error updating list:", error);
      throw new Error(error.response?.data?.message || "Failed to update list");
    }
  };

  const deleteListImpl = async (
    listId: string
  ): Promise<AxiosResponse<any>> => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.delete(`${apiBase}/list/${listId}`, { headers });
      console.log("List deleted successfully");
      // After deleting a list, refresh the list
      await refreshLists();
      return response;
    } catch (error: any) {
      console.error("Error deleting list:", error);
      throw new Error(error.response?.data?.message || "Failed to delete list");
    }
  };

  const unlinkAllTasksFromListImpl = async (
    listId: string
  ): Promise<AxiosResponse<any>> => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(`${apiBase}/list/${listId}/unlink-all-tasks`, {}, { headers });
      console.log("All tasks unlinked from list successfully");
      return response;
    } catch (error: any) {
      console.error("Error unlinking tasks from list:", error);
      throw new Error(error.response?.data?.message || "Failed to unlink tasks from list");
    }
  };

  const getListsImpl = async (): Promise<{
    message: string;
    listsArr: List[];
  }> => {
    const headers = await getAuthHeaders();
    try {
      const { data } = await axios.get<{ message: string; listsArr: List[] }>(
        `${apiBase}/lists`,
        { headers }
      );
      return data;
    } catch (error: any) {
      console.error(
        "Failed to fetch lists:",
        error.response?.data || error.message
      );
      throw new Error(error.response?.data?.message || "Failed to fetch lists");
    }
  };

  // Goals
  const addGoalImpl = async (
    goalData: BaseGoal
  ): Promise<AxiosResponse<any>> => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(`${apiBase}/goal`, goalData, { headers });
      // After adding a goal, refresh the goal list
      await refreshGoals();
      console.log("Goal added successfully");
      return response;
    } catch (error: any) {
      console.error("Error adding goal:", error);
      throw new Error(error.response?.data?.message || "Failed to add goal");
    }
  };

  const updateGoalImpl = async (
    updatedData: UpdateGoalInput
  ): Promise<AxiosResponse<any>> => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.patch(
        `${apiBase}/goal/${updatedData.goal_id}`,
        updatedData,
        { headers }
      );
      // After updating a goal, refresh the goal list
      await refreshGoals();
      return response;
    } catch (error: any) {
      console.error(
        "Failed to update goal:",
        error.response?.data || error.message
      );
      throw new Error(error.response?.data?.message || "Failed to update goal");
    }
  };

  const deleteGoalImpl = async (
    goalId: number
  ): Promise<AxiosResponse<any>> => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.delete(`${apiBase}/goal/${goalId}`, {
        headers,
      });
      // After deleting a goal, refresh the goal list
      await refreshGoals();
      return response;
    } catch (error: any) {
      console.error("Error deleting goal:", error);
      throw new Error(error.response?.data?.message || "Failed to delete goal");
    }
  };

  const getGoalsImpl = async (
    goal_type?: 'daily' | 'weekly' | 'monthly',
    is_completed?: boolean
  ): Promise<{
    message: string;
    goals: Goal[];
  }> => {
    const headers = await getAuthHeaders();
    try {
      let url = `${apiBase}/goals`;
      const queryParams = [];
      
      if (goal_type) queryParams.push(`goal_type=${goal_type}`);
      if (is_completed !== undefined) queryParams.push(`is_completed=${is_completed}`);
      
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }
      
      const { data } = await axios.get<{ message: string; goals: Goal[] }>(
        url,
        { headers }
      );
      return data;
    } catch (error: any) {
      console.error(
        "Failed to fetch goals:",
        error.response?.data || error.message
      );
      throw new Error(error.response?.data?.message || "Failed to fetch goals");
    }
  };

  const getGoalByIdImpl = async (
    goalId: number
  ): Promise<{ message: string; goal: Goal }> => {
    const headers = await getAuthHeaders();
    const url = `${apiBase}/goal/${goalId}`;
    
    try {
      const { data } = await axios.get<{ message: string; goal: Goal }>(
        url,
        { headers }
      );
      console.log("getGoalById - Success response:", data);
      return data;
    } catch (error: any) {
      console.error("getGoalById - Full error object:", error);
      console.error("getGoalById - Error response:", error.response);
      console.error("getGoalById - Error status:", error.response?.status);
      console.error("getGoalById - Error data:", error.response?.data);
      console.error(
        "Failed to fetch goal by ID:",
        error.response?.data || error.message
      );
      throw new Error(
        error.response?.data?.message || "Failed to fetch goal by ID"
      );
    }
  };

  const getGoalProgressImpl = async (
    goalId: number
  ): Promise<{ message: string; data: any }> => {
    const headers = await getAuthHeaders();
    try {
      const { data } = await axios.get<{ message: string; data: any }>(
        `${apiBase}/goal/${goalId}/progress`,
        { headers }
      );
      return data;
    } catch (error: any) {
      console.error(
        "Failed to fetch goal progress:",
        error.response?.data || error.message
      );
      throw new Error(
        error.response?.data?.message || "Failed to fetch goal progress"
      );
    }
  };

  const linkTaskToGoalImpl = async (
    taskId: string,
    goalId: number
  ): Promise<AxiosResponse<any>> => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(
        `${apiBase}/task/link-goal`,
        { taskId, goalId },
        { headers }
      );
      // After linking, refresh both tasks and goals
      await refreshTasks();
      await refreshGoals();
      return response;
    } catch (error: any) {
      console.error(
        "Failed to link task to goal:",
        error.response?.data || error.message
      );
      throw new Error(
        error.response?.data?.message || "Failed to link task to goal"
      );
    }
  };

  const unlinkTaskFromGoalImpl = async (
    taskId: string
  ): Promise<AxiosResponse<any>> => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.delete(
        `${apiBase}/task/${taskId}/unlink-goal`,
        { headers }
      );
      // After unlinking, refresh both tasks and goals
      await refreshTasks();
      await refreshGoals();
      return response;
    } catch (error: any) {
      console.error(
        "Failed to unlink task from goal:",
        error.response?.data || error.message
      );
      throw new Error(
        error.response?.data?.message || "Failed to unlink task from goal"
      );
    }
  };

  // Provide context value
  const contextValue: ApiContextType = {
    // Tasks
    tasks,
    taskLoading,
    taskError,
    addTask: addTaskImpl,
    deleteTask: deleteTaskImpl,
    updateTask: updateTaskImpl,
    getTaskById: getTaskByIdImpl,
    getTasksByDay: getTasksByDayImpl,
    getTasksByMonth: getTasksByMonthImpl,
    getTasksByYear: getTasksByYearImpl,
    getTasksByListId: getTasksByListIdImpl,
    getTasksByGoalId: getTasksByGoalIdImpl,

    // Lists
    lists,
    listLoading,
    listError,
    addList: addListImpl,
    updateList: updateListImpl,
    deleteList: deleteListImpl,
    unlinkAllTasksFromList: unlinkAllTasksFromListImpl,
    getLists: getListsImpl,

    // Goals
    goals,
    goalLoading,
    goalError,
    addGoal: addGoalImpl,
    updateGoal: updateGoalImpl,
    deleteGoal: deleteGoalImpl,
    getGoals: getGoalsImpl,
    getGoalById: getGoalByIdImpl,
    getGoalProgress: getGoalProgressImpl,
    linkTaskToGoal: linkTaskToGoalImpl,
    unlinkTaskFromGoal: unlinkTaskFromGoalImpl,

    // Refresh functions
    refreshTasks,
    refreshLists,
    refreshGoals,
  };

  return (
    <ApiContext.Provider value={contextValue}>{children}</ApiContext.Provider>
  );
};

// Custom hook for using the API context
export const useApi = (): ApiContextType => {
  const context = useContext(ApiContext);

  if (context === undefined) {
    throw new Error("useApi must be used within an ApiProvider");
  }

  return context;
};
