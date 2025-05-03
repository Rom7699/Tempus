import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { CheckBox } from "react-native-elements";
import { Ionicons } from "@expo/vector-icons";

interface Task {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  completed: boolean;
  category: "inbox" | "custom";
  reminder?: boolean;
}

interface TaskItemProps {
    task: Task;
    onToggleComplete: (taskId: string) => void;
  }

// Format date function remains the same
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

// Task item component
const TaskItem: React.FC<TaskItemProps> = ({ task, onToggleComplete }) => {
  const [checked, setChecked] = useState(task.completed);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const strikeWidthAnim = useRef(new Animated.Value(0)).current;

  // Handle checkbox toggle with animation
  const handleToggle = () => {
    const newCheckedState = !checked;
    setChecked(!checked);
    onToggleComplete(task.id);

    if (newCheckedState) {
      // Play completion animation
      Animated.sequence([
        // 1. Quick bounce effect
        Animated.spring(scaleAnim, {
          toValue: 0.95,
          useNativeDriver: true,
          speed: 20,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 3,
        }),
        // 2. Parallel animations for fade and strikethrough
        Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: 10000,
            useNativeDriver: true,
          }),
          Animated.timing(strikeWidthAnim, {
            toValue: 1,
            duration: 10000,

            useNativeDriver: false,
          }),
        ]),
      ]).start();
    } else {
      // Reverse animation when unchecked
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(strikeWidthAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  };

  // Set initial animation state whenever task or completion status changes
  useEffect(() => {
    // Reset and set the proper animation values based on current state
    if (task.completed) {
      opacityAnim.setValue(0.6);
      strikeWidthAnim.setValue(1);
    } else {
      opacityAnim.setValue(1);
      strikeWidthAnim.setValue(0);
    }
  }, [task.completed, task.id]); // Add task.id to detect when a different task is passed

  
  // Calculate width for strikethrough line
  const strikeWidth = strikeWidthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View
      style={[
        styles.taskItem,
        { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
      ]}
    >
      <CheckBox
        checked={checked}
        onPress={handleToggle}
        containerStyle={styles.checkbox}
      />
      <View style={styles.taskContent}>
        <View style={{ position: "relative" }}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <Animated.View
            style={[styles.strikeThrough, { width: strikeWidth }]}
          />
        </View>
        <View style={styles.taskDetails}>
          <Text style={styles.taskTime}>
            {formatDateToShort(task.date)}, {task.startTime}-{task.endTime}
          </Text>
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
      <Text style={styles.taskCategory}>{task.category}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Add new styles for animation
  strikeThrough: {
    position: "absolute",
    height: 1.5,
    backgroundColor: "#999",
    top: "50%",
    left: 0,
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
});

export default TaskItem;
