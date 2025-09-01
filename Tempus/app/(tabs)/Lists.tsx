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
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "@/context/ApiContext";
import { List, BaseList } from "@/types/lists";
import { Task, BaseTask, UpdateTaskInput } from "@/types/tasks";
import AddListModal from "@/components/AddListModal";
import EditListModal from "@/components/EditListModal";
import UnlinkTasksModal from "@/components/UnlinkTasksModal";
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
const ListItem: React.FC<{ 
  list: List; 
  onPress: () => void;
  onMenu: (event: any) => void;
}> = ({
  list,
  onPress,
  onMenu,
}) => {
  return (
    <TouchableOpacity
      style={[styles.listItem, { borderLeftColor: list.list_color }]}
      onPress={onPress}
    >
      <Text style={styles.listIcon}>{list.list_icon}</Text>
      <Text style={styles.listName}>{list.list_name}</Text>
      <TouchableOpacity
        ref={(ref) => {
          // Store reference for position calculation
          if (ref) {
            (ref as any)._list = list;
          }
        }}
        style={styles.menuButton}
        onPress={(e) => {
          e.stopPropagation(); // Prevent triggering the list press
          onMenu(e);
        }}
      >
        <Ionicons name="ellipsis-vertical" size={20} color="#666" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// Main Lists Screen component
const ListsScreen: React.FC = () => {
  // Use the API context
  const {
    lists,
    goals,
    listLoading,
    listError,
    addList,
    updateList,
    deleteList,
    unlinkTasksFromList,
    addTask,
    deleteTask,
    updateTask,
    refreshLists,
    getTasksByListId,
  } = useApi();

  // State for UI
  const [selectedList, setSelectedList] = useState<List | null>(null);
  const [tasksForList, setTasksForList] = useState<Task[]>([]);
  const [isAddListModalVisible, setIsAddListModalVisible] = useState(false);
  const [isEditListModalVisible, setIsEditListModalVisible] = useState(false);
  const [isAddTaskModalVisible, setIsAddTaskModalVisible] = useState(false);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [listMenuVisible, setListMenuVisible] = useState(false);
  const [menuList, setMenuList] = useState<List | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [unlinkModalVisible, setUnlinkModalVisible] = useState(false);

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

  // Handle menu press
  const handleListMenu = (list: List, event: any) => {
    // Get the position of the pressed button
    const target = event.currentTarget;
    target.measureInWindow((x: number, y: number, width: number, height: number) => {
      const menuWidth = 160;
      const menuHeight = 100; // Approximate height of the menu
      
      // Calculate screen dimensions
      const screenWidth = require('react-native').Dimensions.get('window').width;
      const screenHeight = require('react-native').Dimensions.get('window').height;
      
      // Calculate position with boundary checking
      let menuX = x - menuWidth + 50; // Position to the left of button with some overlap
      let menuY = y + height + 5; // Position below the button
      
      // Ensure menu doesn't go off the left edge
      if (menuX < 10) {
        menuX = x + width - menuWidth + 10; // Position to the right of button instead
      }
      
      // Ensure menu doesn't go off the right edge  
      if (menuX + menuWidth > screenWidth - 10) {
        menuX = screenWidth - menuWidth - 10;
      }
      
      // Ensure menu doesn't go off the bottom edge
      if (menuY + menuHeight > screenHeight - 100) {
        menuY = y - menuHeight - 5; // Position above the button instead
      }
      
      setMenuPosition({ x: menuX, y: menuY });
      setMenuList(list);
      setListMenuVisible(true);
    });
  };

  // Handle editing a list
  const handleEditList = () => {
    setListMenuVisible(false);
    setIsEditListModalVisible(true);
  };

  // Handle saving edited list
  const handleSaveEditedList = async (updateData: Partial<BaseList>) => {
    if (!menuList) return;

    try {
      await updateList(menuList.list_id.toString(), updateData);
      Alert.alert("Success", "List updated successfully!");
      setIsEditListModalVisible(false);
    } catch (error: any) {
      console.error("Error updating list:", error);
      Alert.alert("Error", "Failed to update list. Please try again.");
    }
  };

  // Handle deleting a list
  const handleDeleteList = async () => {
    if (!menuList) return;

    Alert.alert(
      "Delete List",
      `Are you sure you want to delete "${menuList.list_name}"?\n\nThis action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteList(menuList.list_id.toString());
              Alert.alert("Success", "List deleted successfully!");
              // If the deleted list was currently selected, clear the selection
              if (selectedList && selectedList.list_id === menuList.list_id) {
                setSelectedList(null);
              }
              setListMenuVisible(false);
            } catch (error: any) {
              console.error("Error deleting list:", error);
              // Check if it's a conflict error (tasks still linked)
              if (error.message && error.message.includes('task(s) linked')) {
                Alert.alert(
                  "Cannot Delete List", 
                  error.message,
                  [{ text: "OK" }]
                );
              } else {
                Alert.alert("Error", "Failed to delete list. Please try again.");
              }
              setListMenuVisible(false);
            }
          },
        },
      ]
    );
  };

  // Helper function to refresh tasks for the current list
  const refreshTasksForCurrentList = async () => {
    if (selectedList) {
      setIsTasksLoading(true);
      try {
        const listId = Number(selectedList.list_id);
        const response = await getTasksByListId(listId);
        if (response && response.tasksArr) {
          setTasksForList(response.tasksArr);
        } else {
          setTasksForList([]);
        }
      } catch (error) {
        console.error("Error refreshing tasks for list:", error);
        setTasksForList([]);
      } finally {
        setIsTasksLoading(false);
      }
    }
  };

  const handleAddTask = async (taskData: BaseTask) => {
    try {
      await addTask(taskData);
      setIsAddTaskModalVisible(false);
      // Refresh the tasks for the current list to show the new task
      await refreshTasksForCurrentList();
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
  const handleEditTask = async (updateData: UpdateTaskInput) => {
    try {
      console.log('[Lists] Updating task with data:', updateData);
      await updateTask(updateData);
      setTaskModalVisible(false);
      
      // Show success message
      Alert.alert("Success", "Task updated successfully!");
      
      // Refresh tasks for the current list to show the updated task
      await refreshTasksForCurrentList();
    } catch (error) {
      console.error("Error editing task:", error);
      Alert.alert("Error", "Failed to update task. Please try again.");
    }
  };

  // Handle deleting a task
  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTaskModalVisible(false);

      // Refresh tasks for the current list to show the updated task list
      await refreshTasksForCurrentList();
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
        task_goal_id: task.task_goal_id,
        is_event: false, // Set to false for tasks
      };

      await updateTask(updateData);

      // Refresh tasks for the current list to show the updated task list
      await refreshTasksForCurrentList();
    } catch (error) {
      console.error("Error toggling task completion:", error);
      Alert.alert("Error", "Failed to update task status. Please try again.");
    }
  };

  // Handle opening the unlink tasks modal
  const handleShowUnlinkModal = () => {
    if (!selectedList) return;

    const taskCount = tasksForList.length;
    if (taskCount === 0) {
      Alert.alert("No Tasks", "There are no tasks linked to this list.");
      return;
    }

    setUnlinkModalVisible(true);
  };

  // Handle unlinking selected tasks
  const handleUnlinkTasks = async (taskIds: string[]) => {
    if (!selectedList) return;

    try {
      await unlinkTasksFromList(selectedList.list_id.toString(), taskIds);
      Alert.alert("Success", `${taskIds.length} task(s) have been unlinked from this list.`);
      // Refresh the tasks for the current list to show the updated list
      await refreshTasksForCurrentList();
    } catch (error: any) {
      console.error("Error unlinking tasks:", error);
      throw error; // Re-throw to let the modal handle the error display
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

          {/* Unlink tasks button - only show if there are tasks */}
          {tasksForList.length > 0 && (
            <TouchableOpacity
              style={styles.unlinkAllButton}
              onPress={handleShowUnlinkModal}
            >
              <Ionicons name="unlink" size={20} color="#FF6B35" />
              <Text style={styles.unlinkAllButtonText}>
                Unlink Tasks ({tasksForList.length})
              </Text>
            </TouchableOpacity>
          )}

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
                <ListItem 
                  list={item} 
                  onPress={() => handleListPress(item)} 
                  onMenu={(event) => handleListMenu(item, event)}
                />
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
          availableGoals={goals}
        />
      )}

      {/* List Menu Modal */}
      <Modal
        visible={listMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setListMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setListMenuVisible(false)}
        >
          <View 
            style={[
              styles.menuContainer,
              {
                position: 'absolute',
                top: menuPosition.y,
                left: menuPosition.x,
              }
            ]}
          >
            <TouchableOpacity style={styles.menuItem} onPress={handleEditList}>
              <Ionicons name="create-outline" size={20} color="#333" />
              <Text style={styles.menuItemText}>Edit List</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.menuItem, styles.deleteMenuItem]} 
              onPress={handleDeleteList}
            >
              <Ionicons name="trash-outline" size={20} color="#FF4444" />
              <Text style={[styles.menuItemText, styles.deleteMenuText]}>Delete List</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit List Modal */}
      {menuList && (
        <EditListModal
          visible={isEditListModalVisible}
          onClose={() => setIsEditListModalVisible(false)}
          onSave={handleSaveEditedList}
          list={menuList}
        />
      )}

      {/* Unlink Tasks Modal */}
      {selectedList && (
        <UnlinkTasksModal
          visible={unlinkModalVisible}
          onClose={() => setUnlinkModalVisible(false)}
          onUnlink={handleUnlinkTasks}
          tasks={tasksForList}
          list={selectedList}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f4fe",
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
    padding: 8,
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
  menuButton: {
    padding: 8,
    marginLeft: "auto",
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
  unlinkAllButton: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: "#fff8f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFE5D0",
  },
  unlinkAllButtonText: {
    fontSize: 14,
    color: "#FF6B35",
    marginLeft: 8,
    fontWeight: "500",
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
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  deleteMenuItem: {
    borderBottomWidth: 0,
  },
  deleteMenuText: {
    color: '#FF4444',
  },
});

export default ListsScreen;
