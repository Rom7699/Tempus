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
import { CheckBox } from "react-native-elements";
import FloatingActionButton from "../../components/AddTaskButton";
import AddTaskModal from "../../components/AddTaskModal"; // Define types for our tasks

interface Task {
  id: string;
  title: string;
  date: string;
  time: string;
  completed: boolean;
  category: "inbox" | "custom";
  reminder?: boolean;
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

// Task item component
const TaskItem: React.FC<{ task: Task }> = ({ task }) => {
  const [checked, setChecked] = useState(task.completed);

  return (
    <View style={styles.taskItem}>
      <CheckBox
        checked={checked}
        onPress={() => setChecked(!checked)}
        containerStyle={styles.checkbox}
      />
      <View style={styles.taskContent}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <View style={styles.taskDetails}>
          <Text style={styles.taskTime}>{task.time}</Text>
          {task.reminder && (
            <Ionicons
              name="alarm-outline"
              size={16}
              color="#999"
              style={styles.taskIcon}
            />
          )}
        </View>
      </View>
      <Text style={styles.taskCategory}>Inbox</Text>
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

// Main Calendar Screen component
const CalendarScreen: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [currentMonth, setCurrentMonth] = useState<string>("April");
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  // Sample tasks data
  const tasks: Task[] = [
    {
      id: "1",
      title: "Workout at the gym",
      date: new Date().toISOString().split("T")[0],
      time: "Today, 10:00",
      completed: false,
      category: "inbox",
      reminder: true,
    },
    {
      id: "2",
      title: "2 hours of leetcode",
      date: new Date().toISOString().split("T")[0],
      time: "Today, 12:00",
      completed: false,
      category: "inbox",
      reminder: true,
    },
    {
      id: "3",
      title: "Finish watching statistics lecture",
      date: new Date().toISOString().split("T")[0],
      time: "Today, 15:30",
      completed: false,
      category: "inbox",
      reminder: true,
    },
  ];

   // Add a new task
   const handleAddTask = (taskData: {
    title: string;
    date: string;
    time: string;
    reminder: boolean;
    category: 'inbox' | 'custom';
  }) => {
    const newTask: Task = {
      id: tasks.length.toString()+1,
      title: taskData.title,
      date: taskData.date,
      time: taskData.time,
      completed: false,
      reminder: taskData.reminder,
      category: taskData.category
    };
    
    setTasks(prevTasks => [...prevTasks, newTask]);
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

  // Generate marked dates for the calendar
  const getMarkedDates = () => {
    const today = new Date().toISOString().split("T")[0];

    // Sample dates with dots
    const markedDates: any = {
      [today]: {
        selected: true,
        selectedColor: "#5D87FF",
      },
      "2025-04-01": { marked: true, dotColor: "#5D87FF" },
      "2025-04-08": { marked: true, dotColor: "#5D87FF" },
      "2025-04-10": { marked: true, dotColor: "#5D87FF" },
      "2025-04-15": { marked: true, dotColor: "#5D87FF" },
      "2025-04-22": { marked: true, dotColor: "#5D87FF" },
      "2025-04-29": { marked: true, dotColor: "#5D87FF" },
    };

    // Add selected date styling
    if (selectedDate !== today) {
      markedDates[selectedDate] = {
        ...markedDates[selectedDate],
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
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />

      {/* Header */}
      <Header title={currentMonth} />

      {/* Calendar */}
      {/* <View style={styles.calendarWrapper}> */}
      <CalendarList
        horizontal = {true}
        pagingEnabled = {true}
        calendarHeight={200}
        onDayPress={handleDateSelect}
        onVisibleMonthsChange={([month]) => handleMonthChange(month)}
        markedDates={getMarkedDates()}
        theme={{
          calendarBackground: "#f9f9f9",
          textSectionTitleColor: "#b6c1cd",
          selectedDayBackgroundColor: "#5D87FF",
          selectedDayTextColor: "#ffffff",
          todayTextColor: "#5D87FF",
          dayTextColor: "#2d4150",
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
          textDayFontSize: 17,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 14,
        }}
        hideExtraDays={false}
        firstDay={1}
      />
      {/* </View> */}
      <ScrollView>
        {/* Today's tasks section */}
        <View style={styles.tasksSection}>
          <Text style={styles.sectionTitle}>TODAY</Text>
          <View style={styles.tasksList}>
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} />
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
        onSave={handleAddTask}
        selectedDate={selectedDate}
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
    flex: 1, 
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
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
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
