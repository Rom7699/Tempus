import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
} from "react-native";
import { CalendarList, DateData } from "react-native-calendars";
import FloatingActionButton from "../../components/AddTaskButton";
import AddTaskBottomSheet from "../../components/AddTaskBottomSheet";
import DisplayTaskModal from "@/components/DisplayTaskModal";
import { CalendarHeader } from "../../components/calendar/CalendarHeader";
import { useApi } from "../../context/ApiContext";
import { BaseTask, Task, UpdateTaskInput } from "@/types/tasks";
import { TaskSection } from "../../components/calendar/TaskSection";

// Constants
const monthNames: string[] = [
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
    goals,
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
      // Use setTimeout to defer the refresh to avoid useInsertionEffect warning
      setTimeout(() => {
        refreshTasks(currentMonthNumber, currentYear);
      }, 0);
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const handleEditTask = async (updateData: UpdateTaskInput) => {
    try {
      console.log('[Calendar] Updating task with data:', updateData);
      await updateTask(updateData);
      setTaskModalVisible(false);
      
      // Show success message
      Alert.alert("Success", "Task updated successfully!");
      
      refreshTasks(currentMonthNumber, currentYear);
      console.log("refreshing tasks after edit");
    } catch (error) {
      console.error("Error editing task:", error);
      Alert.alert("Error", "Failed to update task. Please try again.");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTaskModalVisible(false);
      refreshTasks(currentMonthNumber, currentYear);
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
        task_goal_id: task.task_goal_id,
        is_event: false,
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
  const markedDates = useMemo(() => {
    console.log("Generating marked dates for tasks:", tasks.length);
    const markedDates: { [date: string]: any } = {};

    tasks.forEach((task: Task) => {
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
  }, [tasks, selectedDate]);

  // Handle date selection
  const handleDateSelect = (date: DateData) => {
    setSelectedDate(date.dateString);
  };

  // Handle month change
  const handleMonthChange = (date: DateData) => {
    setCurrentMonth(monthNames[date.month - 1]);
    setCurrentMonthNumber(date.month);
    setCurrentYear(date.year);

    const firstDayOfMonth = `${date.year}-${String(date.month).padStart(
      2,
      "0"
    )}-01`;
    setSelectedDate(firstDayOfMonth);
  };

  // Filter tasks for the selected date
  const tasksForSelectedDate = tasks.filter((task: Task) => {
    const taskDate = task.task_start_date?.split("T")[0];
    const normalizedSelectedDate = selectedDate.split("T")[0];
    return taskDate === normalizedSelectedDate;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f1f4fe" />

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
          markedDates={markedDates}
          showSixWeeks={true}
          theme={{
            calendarBackground: "#f1f4fe",

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
          availableGoals={goals}
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
