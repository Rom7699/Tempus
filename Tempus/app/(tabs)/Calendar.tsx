import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { CalendarList, DateData } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import FloatingActionButton from "../../components/AddTaskButton";
import AddTaskModal from "../../components/AddTaskModal"; // Define types for our tasks
import TaskItem from "../../components/TaskItem";
import { AuthService } from "../../services/AuthService";

import {
  getLists,
  getTasksByMonth,
  getTasksByYear,
} from "@/context/ApiContext";
import { BaseList, List } from "@/types/lists";
import { BaseTask, Task } from "@/types/tasks";

interface Task3 {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  completed: boolean;
  category: "inbox" | "custom";
  reminder?: boolean;
}

interface TaskDB {
  // Core identifiers
  user_id: string;
  task_id: string;

  // Task content
  task_name: string;
  task_description?: string;
  task_list_id?: number;

  // Timing information
  task_start_date?: string; // ISO date format 'YYYY-MM-DD'
  task_start_time?: string; // Format 'HH:MM:SS'
  task_end_date?: string; // ISO date format 'YYYY-MM-DD'
  task_end_time?: string; // Format 'HH:MM:SS'

  // Additional properties
  task_reminder?: boolean;
  task_location?: string;
  task_attendees?: string[];
  task_priority?: number;
  task_energy_level?: number;

  // Metadata
  task_creation_date: string; // Timestamp with timezone
}

// Define types for habits
interface Habit {
  id: string;
  title: string;
  icon: React.ReactNode;
  streak?: number;
}

// Component for the header with month title and controls
const Header: React.FC<{ title: string }> = ({ title }) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.menuButton}>
        <Ionicons name="menu-outline" size={24} color="black" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerRightContainer}>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="options-outline" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color="black" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Habit item component
const HabitItem: React.FC<{ habit: Habit }> = ({ habit }) => {
  return (
    <View style={styles.habitItem}>
      <View style={styles.habitIcon}>{habit.icon}</View>
      <Text style={styles.habitTitle}>{habit.title}</Text>
      <View style={styles.habitRightSection}>
        <Text style={styles.habitToday}>Today</Text>
      </View>
    </View>
  );
};

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

export const fetchTasksByMonth = async (month: number, year: number) => {
  try {
    // Make sure to pass the month and year as part of the URL path
    const tasksByMonth = await getTasksByMonth(month, year);

    console.log("Tasks fetched:", tasksByMonth.data);

    // Ensure the structure matches your TaskDB interface
    return tasksByMonth.data;
  } catch (error: any) {
    console.error(
      "Error fetching tasks:",
      error?.response?.data || error.message
    );
  }
};

const testFetchTasksByMonth = async () => {
  try {
    // Test with a specific month (e.g., 4 for April) and year (e.g., 2025)
    const tasks = await fetchTasksByMonth(5, 2025);
  } catch (error) {
    console.error("Error during testing:", error);
  }
};

// Main Calendar Screen component
const CalendarScreen: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [currentMonth, setCurrentMonth] = useState<string>("April");
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [availableLists, setAvailableLists] = useState<List[]>([]);
  // Track current view's year and month
  const [currentYear, setCurrentYear] = useState<number>(
    new Date().getFullYear()
  );
  const [currentMonthNumber, setCurrentMonthNumber] = useState<number>(
    new Date().getMonth() + 1
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Load both lists and tasks when component mounts or month changes
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load lists
        const listsResponse = await getLists();
        if (listsResponse?.data) {
          setAvailableLists(listsResponse.data);
        }

        // Load tasks using fetchTasksByMonth
        const tasksData = await fetchTasksByMonth(
          currentMonthNumber,
          currentYear
        );
        if (tasksData) {
          // Transform API data to match Task3 interface
          const formattedTasks = tasksData.map((taskData: any) => ({
            id: taskData.task_id,
            title: taskData.task_name,
            date:
              taskData.task_start_date ||
              new Date().toISOString().split("T")[0],
            startTime: taskData.task_start_time?.substring(0, 5) || "09:00",
            endTime: taskData.task_end_time?.substring(0, 5) || "10:00",
            completed: false, // Set default value since it's not in the API response
            category: "inbox" as "inbox" | "custom", // Explicitly type as "inbox" | "custom"
            reminder: taskData.task_reminder || false,
          }));

          setTasks(formattedTasks);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [currentMonthNumber, currentYear]); // Re-run when month or year changes
  // Sample tasks data
  const [tasks, setTasks] = useState<Task3[]>([]);

  const toggleTaskCompletion = (taskId: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  // Add a new task
  const handleAddTask = (taskData: {
    title: string;
    date: string;
    time: string;
    reminder: boolean;
    category: "inbox" | "custom";
  }) => {
    const newTask: Task3 = {
      id: tasks.length.toString() + 1,
      title: taskData.title,
      date: taskData.date,
      startTime: taskData.time,
      endTime: taskData.time,
      completed: false,
      reminder: taskData.reminder,
      category: taskData.category,
    };

    //setTasks((prevTasks) => [...prevTasks, newTask]);
  };

  // Sample habits data
  const habits: Habit[] = [
    {
      id: "1",
      title: "Meditate",
      icon: (
        <View style={[styles.habitIconBg, { backgroundColor: "#E8D7FF" }]}>
          <Ionicons name="flower-outline" size={18} color="#9966CC" />
        </View>
      ),
    },
    {
      id: "2",
      title: "OS Course",
      icon: (
        <View style={[styles.habitIconBg, { backgroundColor: "#E0F0FF" }]}>
          <Ionicons name="checkmark-outline" size={18} color="#4285F4" />
        </View>
      ),
    },
  ];

  const getMarkedDates = () => {
    console.log("Tasks count:", tasks.length);
    const markedDates: {[date: string]: any} = {};
  
    tasks.forEach((task) => {
      // Format the date key properly - extract just YYYY-MM-DD part
      const dateKey = task.date.split('T')[0];
      
      markedDates[dateKey] = {
        ...markedDates[dateKey],
        marked: true,
        dotColor: "#5D87FF",
      };
    });
  
    // Also format the selected date if needed
    if (selectedDate) {
      const formattedSelectedDate = selectedDate.split('T')[0];
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
  const handleMonthChange = (month: DateData) => {
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
    setCurrentMonth(monthNames[month.month - 1]);

    setCurrentMonthNumber(month.month);
    setCurrentYear(month.year);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />

      {/* Header */}
      <Header title={currentMonth} />

      <View style={styles.calendarWrapper}>
        <CalendarList
          renderHeader={() => null}
          horizontal={true}
          pagingEnabled={true}
          calendarHeight={200}
          onDayPress={handleDateSelect}
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
      <ScrollView style={{ flex: 1 }}>
        {/* Today's tasks section */}
        <View style={styles.tasksSection}>
          <Text style={styles.sectionTitle}>
            {formatDateToShort(selectedDate)}
          </Text>
          <View style={styles.tasksList}>
            {tasks
              .filter((task) => {
                // Normalize both dates to YYYY-MM-DD format for proper comparison
                const taskDate = task.date.split('T')[0];
                const normalizedSelectedDate = selectedDate.split('T')[0];
                return taskDate === normalizedSelectedDate;
              })
              .map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggleComplete={toggleTaskCompletion}
                />
              ))}
          </View>
        </View>

        {/* Habits section */}
        <View style={styles.habitsSection}>
          <Text style={styles.sectionTitle}>Habit</Text>
          <View style={styles.habitsList}>
            {habits.map((habit) => (
              <HabitItem key={habit.id} habit={habit} />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* FAB Button */}
      <FloatingActionButton onPress={() => setModalVisible(true)} />

      {/* Add Task Modal */}
      <AddTaskModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        selectedDate={selectedDate ? new Date(selectedDate) : undefined}
        availableLists={availableLists} // Pass the available lists to the modal
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
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
    position: "absolute", // Add this
    left: 0, // Add this
    right: 0, // Add this
    textAlign: "center", // Add this
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
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 8,
    backgroundColor: "white",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  checkbox: {
    padding: 0,
    marginLeft: 8,
    marginRight: 8,
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  taskDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskTime: {
    fontSize: 14,
    color: "#5D87FF",
    marginRight: 8,
  },
  taskIcon: {
    marginRight: 4,
  },
  taskCategory: {
    fontSize: 14,
    color: "#999",
    paddingHorizontal: 16,
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
  fab: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#5D87FF",
    right: 24,
    bottom: 80,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default CalendarScreen;
