import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { CalendarList, DateData } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import FloatingActionButton from "../../components/AddTaskButton";
import TaskDetailItem from "../../components/NewTaskItem";
import AddTaskBottomSheet from "../../components/AddTaskBottomSheet";
import DisplayTaskModal from "@/components/DisplayTaskModal";
import { CalendarHeader } from "../../components/calendar/CalendarHeader";
import { useApi } from "@/context/ApiContext";
import { BaseTask, Task, UpdateTaskInput } from "@/types/tasks";
import { TaskSection } from "../../components/calendar/TaskSection";

// Constants
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Format date for section titles
function formatDateToShort(dateString: string): string {
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
}

// Empty state component
const EmptyTasksView = ({ onAddTask }: { onAddTask: () => void }) => (
  <View style={styles.emptyStateContainer}>
    <Text style={styles.emptyStateText}>No tasks for this day</Text>
    <TouchableOpacity style={styles.addTaskButton} onPress={onAddTask}>
      <Text style={styles.addTaskButtonText}>Add a task</Text>
    </TouchableOpacity>
  </View>
);

// Error state component
const ErrorView = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorText}>{message}</Text>
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <Text style={styles.retryButtonText}>Retry</Text>
    </TouchableOpacity>
  </View>
);

// Loading state component
const LoadingView = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#5D87FF" />
    <Text style={styles.loadingText}>Loading tasks...</Text>
  </View>
);

// Main Calendar Screen component
const CalendarScreen: React.FC = () => {
  // API context
  const {
    tasks,
    taskLoading,
    taskError,
    addTask,
    updateTask,
    deleteTask,
    refreshTasks,
    lists,
    refreshLists,
  } = useApi();

  // State
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [currentMonth, setCurrentMonth] = useState<string>(
    monthNames[new Date().getMonth()]
  );
  const [currentYear, setCurrentYear] = useState<number>(
    new Date().getFullYear()
  );
  const [currentMonthNumber, setCurrentMonthNumber] = useState<number>(
    new Date().getMonth() + 1
  );
  const [taskModalVisible, setTaskModalVisible] = useState<boolean>(false);
  const [addTaskModalVisible, setAddTaskModalVisible] =
    useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Load tasks and lists on component mount or when month/year changes
  useEffect(() => {
    refreshTasks(currentMonthNumber, currentYear);
    refreshLists();
  }, [currentMonthNumber, currentYear]);

  // Handlers
  const handleAddTask = async (taskData: BaseTask) => {
    try {
      await addTask(taskData);
      setAddTaskModalVisible(false);
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const handleEditTask = async (task: Task) => {
    try {
      // For editing, we'll need to implement this. For now, just close modals
      setTaskModalVisible(false);
    } catch (error) {
      console.error("Error editing task:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTaskModalVisible(false);
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleToggleTaskCompletion = async (
    task: Task,
    isCompleted: boolean
  ) => {
    try {
      const updateData: UpdateTaskInput = {
        task_id: task.task_id,
        is_completed: isCompleted,
        is_event: true,
      };

      await updateTask(updateData);
    } catch (error) {
      console.error("Error toggling task completion:", error);
    }
  };

  const handleTaskPress = (task: Task) => {
    setSelectedTask(task);
    setTaskModalVisible(true);
  };

  // Generate marked dates for the calendar
  const getMarkedDates = () => {
    const markedDates: { [date: string]: any } = {};

    tasks.forEach((task) => {
      const dateKey = task.task_start_date?.split("T")[0];
      if (dateKey) {
        markedDates[dateKey] = {
          ...markedDates[dateKey],
          marked: true,
          dotColor: "#5D87FF",
        };
      }
    });

    if (selectedDate) {
      const formattedSelectedDate = selectedDate.split("T")[0];
      markedDates[formattedSelectedDate] = {
        ...markedDates[formattedSelectedDate],
        selected: true,
        selectedColor: "#5D87FF",
      };
    }

    return markedDates;
  };

  // Handle date selection
  const handleDateSelect = (date: DateData) => {
    setSelectedDate(date.dateString);
  };

  // Handle month change
  const handleMonthChange = (date: DateData) => {
    setCurrentMonth(monthNames[date.month - 1]);
    setCurrentMonthNumber(date.month);
    setCurrentYear(date.year);
  };

  // Filter tasks for the selected date
  const tasksForSelectedDate = tasks.filter((task) => {
    const taskDate = task.task_start_date?.split("T")[0];
    const normalizedSelectedDate = selectedDate.split("T")[0];
    return taskDate === normalizedSelectedDate;
  });

  // If loading initial data
  if (taskLoading && tasks.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />
        <CalendarHeader title={currentMonth} />
        <LoadingView />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />

      {/* Header */}
      <CalendarHeader title={currentMonth} />

      {/* Calendar */}
      <View style={styles.calendarWrapper}>
        <CalendarList
          renderHeader={() => null}
          horizontal={true}
          pagingEnabled={true}
          calendarHeight={200}
          pastScrollRange={50}
          futureScrollRange={50}
          onDayPress={handleDateSelect}
          current={`${currentYear}-${String(currentMonthNumber).padStart(
            2,
            "0"
          )}-01`}
          onVisibleMonthsChange={([month]) => handleMonthChange(month)}
          markedDates={getMarkedDates()}
          showSixWeeks={true}
          theme={{
            calendarBackground: "#f9f9f9",
            textSectionTitleColor: "#b6c1cd",
            selectedDayBackgroundColor: "#5D87FF",
            selectedDayTextColor: "#ffffff",
            todayTextColor: "#5D87FF",
            todayBackgroundColor: "#ffffff",
            dayTextColor: "#2d4150",
            textDayFontWeight: "bold",
            textDisabledColor: "#d9e1e8",
            dotColor: "#5D87FF",
            selectedDotColor: "#ffffff",
            arrowColor: "#5D87FF",
            monthTextColor: "#2d4150",
            indicatorColor: "#5D87FF",
            textDayFontFamily: "System",
            textMonthFontFamily: "System",
            textDayHeaderFontFamily: "System",
            textMonthFontWeight: "bold",
            textDayFontSize: 16,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 14,
          }}
          hideExtraDays={false}
        />
      </View>

      {/* Refreshing indicator */}
      {taskLoading && tasks.length > 0 && (
        <View style={styles.refreshingIndicator}>
          <ActivityIndicator size="small" color="#5D87FF" />
        </View>
      )}

      <ScrollView style={{ flex: 1 }}>
        <TaskSection
          selectedDate={selectedDate}
          tasks={tasksForSelectedDate}
          taskLoading={taskLoading}
          taskError={taskError}
          onTaskPress={handleTaskPress}
          onAddTask={() => setAddTaskModalVisible(true)}
          onRetry={refreshTasks}
        />
      </ScrollView>

      {/* FAB Button */}
      <FloatingActionButton onPress={() => setAddTaskModalVisible(true)} />

      {/* Add Task Bottom Sheet */}
      <AddTaskBottomSheet
        visible={addTaskModalVisible}
        onClose={() => setAddTaskModalVisible(false)}
        onSave={handleAddTask}
        selectedDate={selectedDate ? new Date(selectedDate) : undefined}
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
  refreshingIndicator: {
    position: "absolute",
    top: 330,
    left: 0,
    right: 0,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
    zIndex: 999,
  },
  errorContainer: {
    backgroundColor: "#fff8f8",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ffdddd",
    alignItems: "center",
  },
  errorText: {
    color: "#d32f2f",
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: "#5D87FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  emptyStateContainer: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "white",
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 12,
  },
  addTaskButton: {
    backgroundColor: "#5D87FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addTaskButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  calendarWrapper: {
    height: 330,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    position: "relative",
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
  },
  headerRightContainer: {
    flexDirection: "row",
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  tasksSection: {
    flex: 1,
    paddingHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    color: "#333",
  },
  tasksList: {
    flex: 1,
  },
  habitsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80, // Make room for the tab bar
  },
  habitsList: {
    maxHeight: 120,
  },
  habitItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 8,
  },
  habitIcon: {
    marginRight: 16,
  },
  habitIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  habitTitle: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  habitRightSection: {
    paddingHorizontal: 16,
  },
  habitToday: {
    fontSize: 14,
    color: "#5D87FF",
  },
});

export default CalendarScreen;
