import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated, TouchableOpacity } from "react-native";
import { CheckBox } from "react-native-elements";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "@/context/ApiContext";
import { Task, UpdateTaskInput } from "@/types/tasks";

interface TaskItemProps {
  task: Task;
  onToggleComplete: (taskId: string) => void;
}

function formatDateToShort(dateString: string | undefined): string {
  if (!dateString) return "N/A";
  
  const date = new Date(dateString);
  const day = date.getDate();
  const monthNames = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
  ];
  const month = monthNames[date.getMonth()];
  return `${day} ${month}`;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggleComplete }) => {
  const { updateTask } = useApi();
  const [checked, setChecked] = useState(task.is_completed);
  const [isUpdating, setIsUpdating] = useState(false);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const strikeWidthAnim = useRef(new Animated.Value(0)).current;

  // Handle checkbox toggle with animation
  const handleToggle = async () => {
    if (isUpdating) return; // Prevent multiple rapid toggles

    const newCheckedState = !checked;
    setChecked(newCheckedState);
    
    // Call the parent's onToggleComplete for immediate UI feedback
    onToggleComplete(task.task_id);

    // Play animations
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
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(strikeWidthAnim, {
            toValue: 1,
            duration: 300,
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

    // Update the task in the API
    try {
      setIsUpdating(true);
      
      // Create the update payload
      const updateData: UpdateTaskInput = {
        task_id: task.task_id,
        is_completed: newCheckedState,
      };
      
      await updateTask(updateData);
    } catch (error) {
      console.error("Failed to update task completion status:", error);
      
      // Revert the UI state if the API call fails
      setChecked(!newCheckedState);
      
      // Revert animations
      if (!newCheckedState) {
        Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(strikeWidthAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: false,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(strikeWidthAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: false,
          }),
        ]).start();
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Set initial animation state whenever task or completion status changes
  useEffect(() => {
    // Reset and set the proper animation values based on current state
    if (task.is_completed) {
      opacityAnim.setValue(0.6);
      strikeWidthAnim.setValue(1);
      setChecked(true);
    } else {
      opacityAnim.setValue(1);
      strikeWidthAnim.setValue(0);
      setChecked(false);
    }
  }, [task.is_completed, task.task_id]); // Add task.id to detect when a different task is passed

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
        disabled={isUpdating}
      />
      <View style={styles.taskContent}>
        <View style={{ position: "relative" }}>
          <Text style={styles.taskTitle}>{task.task_name}</Text>
          <Animated.View
            style={[styles.strikeThrough, { width: strikeWidth }]}
          />
        </View>
        <View style={styles.taskDetails}>
          <Text style={styles.taskTime}>
            {formatDateToShort(task.task_start_date)}, {task.task_start_time}-{task.task_end_time}
          </Text>
          {task.task_reminder && (
            <Ionicons
              name="alarm-outline"
              size={16}
              color="#999"
              style={styles.taskIcon}
            />
          )}
        </View>
      </View>
      <Text style={styles.taskCategory}>{task.task_list_id}</Text>
      
      {/* Menu button (optional) */}
      <TouchableOpacity style={styles.menuButton}>
        <Ionicons name="ellipsis-vertical" size={16} color="#999" />
      </TouchableOpacity>
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
    paddingRight: 10,
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
  menuButton: {
    padding: 5,
  },
});

export default TaskItem;