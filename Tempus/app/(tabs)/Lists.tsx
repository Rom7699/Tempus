import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "@/context/ApiContext";
import { List, BaseList } from "@/types/lists";
import { Task, BaseTask, UpdateTaskInput } from "@/types/tasks";
import AddListModal from "@/components/AddListModal";
import TaskDetailItem from "../../components/NewTaskItem";
import AddTaskBottomSheet from "@/components/AddTaskBottomSheet";
import DisplayTaskModal from "@/components/DisplayTaskModal";
import FloatingActionButton from "../../components/AddTaskButton";

// Header component with title and controls
const Header: React.FC<{ title: string; onAddList: () => void }> = ({
  title,
  onAddList,
}) => {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity style={styles.addButton} onPress={onAddList}>
        <Ionicons name="add" size={24} color="#333" />
      </TouchableOpacity>
    </View>
  );
};

// List component
const ListItem: React.FC<{ list: List; onPress: () => void }> = ({
  list,
  onPress,
}) => {
  console.log("ListItem rendered with list:", list);
  return (
    <TouchableOpacity
      style={[styles.listItem, { borderLeftColor: list.list_color }]}
      onPress={onPress}
    >
      <Text style={styles.listIcon}>{list.list_icon}</Text>
      <Text style={styles.listName}>{list.list_name}</Text>
      <Ionicons name="chevron-forward" size={24} color="#CCCCCC" />
    </TouchableOpacity>
  );
};

// Main Lists Screen component
const ListsScreen: React.FC = () => {
  // Use the API context
  const {
    lists,
    tasks,
    listLoading,
    listError,
    taskLoading,
    taskError,
    addList,
    addTask,
    deleteTask,
    updateTask,
    refreshLists,
    refreshTasks,
    getTasksByListId,
  } = useApi();

  // State for UI
  const [selectedList, setSelectedList] = useState<List | null>(null);
  const [tasksForList, setTasksForList] = useState<Task[]>([]);
  const [isAddListModalVisible, setIsAddListModalVisible] = useState(false);
  const [isAddTaskModalVisible, setIsAddTaskModalVisible] = useState(false);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Load lists when component mounts
  useEffect(() => {
    refreshLists();
    console.log("[Lists.tsx] Lists loaded:", lists);
  }, [refreshLists]);

  // Format date for display
  const formatDateToShort = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate();
    const monthNames = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];
    const month = monthNames[date.getMonth()];
    return `${day} ${month}`;
  };

  // Handle list selection
  const handleListPress = async (list: List) => {
    setSelectedList(list);
    setIsTasksLoading(true);

    try {
      // Assuming there's a method to get tasks by list ID
      const listId = Number(list.list_id);
      if (isNaN(listId)) {
        console.error("Invalid list ID:", list.list_id);
        throw new Error("Invalid list ID");
      }

      const response = await getTasksByListId(listId);
      console.log("Tasks for list:", response);
      if (response && response.tasksArr) {
        setTasksForList(response.tasksArr);
      } else {
        setTasksForList([]);
      }
    } catch (error) {
      console.error("Error fetching tasks for list:", error);
      Alert.alert("Error", "Failed to load tasks for this list.");
      setTasksForList([]);
    } finally {
      setIsTasksLoading(false);
    }
  };

  // Handle adding a new list
  const handleAddList = async (newList: BaseList) => {
    try {
      const response = await addList(newList);
      setIsAddListModalVisible(false);
      // Lists will be refreshed automatically through the context
      return response.data;
    } catch (error) {
      console.error("Error adding list:", error);
      Alert.alert("Error", "Failed to add list. Please try again.");
    }
  };

  const handleAddTask = async (taskData: BaseTask) => {
    try {
      await addTask(taskData);
      setIsAddTaskModalVisible(false);
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  // Handle task press to show DisplayTaskModal
  const handleTaskPress = (task: Task) => {
    setSelectedTask(task);
    setTaskModalVisible(true);
  };

  // Handle editing a task
  const handleEditTask = async (task: Task) => {
    try {
      // For editing, we'll need to implement this. For now, just close modals
      setTaskModalVisible(false);
    } catch (error) {
      console.error("Error editing task:", error);
    }
  };

  // Handle deleting a task
  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTaskModalVisible(false);

      // Refresh tasks for the current list if one is selected
      if (selectedList) {
        const listId = Number(selectedList.list_id);
        const response = await getTasksByListId(listId);
        if (response && response.tasksArr) {
          setTasksForList(response.tasksArr);
        }
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      Alert.alert("Error", "Failed to delete task. Please try again.");
    }
  };

  // Handle toggling task completion
  const handleToggleTaskCompletion = async (
    task: Task,
    isCompleted: boolean
  ) => {
    try {
      const updateData: UpdateTaskInput = {
        task_id: task.task_id,
        is_completed: isCompleted,
        is_event: true, // Set to true as required by the API
      };

      await updateTask(updateData);

      // Refresh tasks for the current list if one is selected
      if (selectedList) {
        const listId = Number(selectedList.list_id);
        const response = await getTasksByListId(listId);
        if (response && response.tasksArr) {
          setTasksForList(response.tasksArr);
        }
      }
    } catch (error) {
      console.error("Error toggling task completion:", error);
      Alert.alert("Error", "Failed to update task status. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />

      {/* Header */}
      <Header
        title={selectedList ? selectedList.list_name : "My Lists"}
        onAddList={() => setIsAddListModalVisible(true)}
      />

      {selectedList ? (
        // List details view with tasks
        <View style={styles.tasksContainer}>
          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedList(null)}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
            <Text style={styles.backButtonText}>Back to Lists</Text>
          </TouchableOpacity>

          {/* Tasks for selected list */}
          {isTasksLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#5D87FF" />
              <Text style={styles.loadingText}>Loading tasks...</Text>
            </View>
          ) : (
            <View style={styles.tasksList}>
              {tasksForList.length > 0 ? (
                <FlatList
                  data={tasksForList}
                  keyExtractor={(item) => item.task_id}
                  renderItem={({ item }) => (
                    <TaskDetailItem
                      key={item.task_id}
                      task={item}
                      onPress={handleTaskPress}
                    />
                  )}
                  contentContainerStyle={styles.tasksListContent}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="list" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>No tasks in this list</Text>
                  <TouchableOpacity
                    style={styles.addTaskButton}
                    onPress={() => setIsAddTaskModalVisible(true)}
                  >
                    <Text style={styles.addTaskButtonText}>Add a task</Text>
                  </TouchableOpacity>
                </View>
              )}
              {/* FAB to add task */}
              <FloatingActionButton
                onPress={() => setIsAddTaskModalVisible(true)}
                customPosition={{ bottom: 60 }}
              />
            </View>
          )}
        </View>
      ) : (
        // Lists overview
        <View style={styles.listsContainer}>
          {listLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#5D87FF" />
              <Text style={styles.loadingText}>Loading lists...</Text>
            </View>
          ) : listError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{listError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => refreshLists()}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : lists.length > 0 ? (
            <FlatList
              data={lists}
              keyExtractor={(item) => item.list_id.toString()}
              renderItem={({ item }) => (
                <ListItem list={item} onPress={() => handleListPress(item)} />
              )}
              contentContainerStyle={styles.listsListContent}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="list" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No lists yet</Text>
              <TouchableOpacity
                style={styles.addListButton}
                onPress={() => setIsAddListModalVisible(true)}
              >
                <Text style={styles.addListButtonText}>
                  Create your first list
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Add List Modal */}
      <AddListModal
        visible={isAddListModalVisible}
        onClose={() => setIsAddListModalVisible(false)}
        onSave={handleAddList}
      />

      {/* Add Task Modal */}
      <AddTaskBottomSheet
        visible={isAddTaskModalVisible}
        onClose={() => setIsAddTaskModalVisible(false)}
        selectedDate={new Date()}
        onSave={handleAddTask}
        selectedList={selectedList}
      />

      {/* Display Task Modal */}
      {selectedTask && (
        <DisplayTaskModal
          visible={taskModalVisible}
          onClose={() => setTaskModalVisible(false)}
          task={selectedTask}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
          onToggle={handleToggleTaskCompletion}
          availableLists={lists}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: "#fff8f8",
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ffdddd",
  },
  errorText: {
    color: "#d32f2f",
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: "#5D87FF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  listsContainer: {
    flex: 1,
  },
  listsListContent: {
    padding: 16,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  listName: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginTop: 16,
    marginBottom: 16,
  },
  addListButton: {
    backgroundColor: "#5D87FF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addListButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  tasksContainer: {
    flex: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButtonText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 8,
  },
  tasksList: {
    flex: 1,
  },
  tasksListContent: {
    padding: 16,
  },
  floatingActionButton: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#5D87FF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addTaskButton: {
    backgroundColor: "#5D87FF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addTaskButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default ListsScreen;
