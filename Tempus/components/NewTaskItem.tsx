import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Task } from "@/types/tasks";

interface TaskDetailItemProps {
  task: Task;
  onPress: (task: Task) => void;
  showCompleteButton?: boolean;
  onToggleComplete?: (taskId: string) => void;
}

const getPriorityColor = (priority: number): string => {
  switch (priority) {
    case 1: return "#4CAF50"; // Low priority - Green
    case 2: return "#FFC107"; // Medium priority - Yellow/Amber
    case 3: return "#FF5722"; // High priority - Orange/Red
    default: return "#888";   // Default - Gray
  }
};

const formatNiceDateTime = (date: string, time?: string): string => {
  if (!date) return "No date";
  
  const dateObj = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const isToday = dateObj.setHours(0,0,0,0) === today.setHours(0,0,0,0);
  const isTomorrow = dateObj.setHours(0,0,0,0) === tomorrow.setHours(0,0,0,0);
  
  // Format date part
  let dateStr = "";
  if (isToday) {
    dateStr = "Today";
  } else if (isTomorrow) {
    dateStr = "Tomorrow";
  } else {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    };
    dateStr = dateObj.toLocaleDateString(undefined, options);
  }
  
  // Add time if provided
  if (time) {
    // Format from "HH:mm:ss" to "HH:mm" (24-hour format)
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);
    const formattedHour = hour.toString().padStart(2, '0');
    const formattedMinute = minute.toString().padStart(2, '0');
    
    return `${dateStr}, ${formattedHour}:${formattedMinute}`;
  }
  
  return dateStr;
};

const TaskDetailItem: React.FC<TaskDetailItemProps> = ({ 
  task, 
  onPress, 
  showCompleteButton = false, 
  onToggleComplete 
}) => {
  // Local state for optimistic updates
  const [localTask, setLocalTask] = useState<Task>(task);
  
  // Update local state when task prop changes
  useEffect(() => {
    setLocalTask(task);
  }, [task]);

  // Optimistic toggle handler
  const handleToggleComplete = () => {
    if (onToggleComplete) {
      // Update local state immediately for fast UI response
      const updatedTask = { ...localTask, is_completed: !localTask.is_completed };
      setLocalTask(updatedTask);
      
      // Call parent handler (which will do the actual API call)
      onToggleComplete(task.task_id);
    }
  };

  // Check if we have priority - we can use it for visual indicators
  const hasPriority = localTask.task_priority !== undefined;
  const priorityColor = hasPriority ? getPriorityColor(localTask.task_priority!) : '#888';

  return (
    <TouchableOpacity
      style={[
        styles.taskItem,
        localTask.is_completed && styles.taskItemCompleted
      ]}
      onPress={() => onPress(task)}
    >
      <View style={[styles.taskPriorityIndicator, { backgroundColor: priorityColor }]} />
      <View style={styles.taskDetails}>
        <View style={styles.taskTitleRow}>
          <Text style={[
            styles.taskTitle,
            localTask.is_completed && styles.taskTitleCompleted
          ]}>
            {localTask.task_name}
          </Text>
          <View style={styles.badgesContainer}>
            {/* Display badge based on is_event value */}
            {localTask.is_event ? (
              <View style={styles.taskBadge}>
                <Ionicons name="calendar" size={12} color="#4CAF50" />
                <Text style={styles.taskBadgeText}>Event</Text>
              </View>
            ) : (
              <View style={styles.eventBadge}>
                <Ionicons name="checkbox-outline" size={12} color="#5D87FF" />
                <Text style={styles.eventBadgeText}>Task</Text>
              </View>
            )}

            {/* AI badge for AI-generated tasks */}
            {localTask.is_ai_generated && (
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles-outline" size={12} color="#9C27B0" />
                <Text style={styles.aiBadgeText}>AI</Text>
              </View>
            )}
          </View>
        </View>

        {/* Nice date/time display */}
        {localTask.task_start_date && (
          <View style={styles.dateTimeContainer}>
            <Ionicons
              name={localTask.task_end_time ? "time-outline" : "calendar-outline"}
              size={14}
              color="#888"
              style={styles.dateTimeIcon}
            />
            <Text style={[
              styles.dateTimeText,
              localTask.is_completed && styles.dateTimeTextCompleted
            ]}>
              {formatNiceDateTime(localTask.task_start_date, localTask.task_start_time)}
            </Text>
          </View>
        )}
      </View>
      
      {showCompleteButton && onToggleComplete ? (
        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleToggleComplete}
        >
          <View style={[
            styles.checkbox,
            localTask.is_completed && styles.checkboxCompleted
          ]}>
            {localTask.is_completed && (
              <Ionicons name="checkmark" size={16} color="#fff" />
            )}
          </View>
        </TouchableOpacity>
      ) : (
        <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  taskItemCompleted: {
    opacity: 0.7,
    backgroundColor: '#f8f9fa',
  },
  taskPriorityIndicator: {
    width: 4,
    height: '80%',
    borderRadius: 2,
    marginRight: 10,
  },
  taskDetails: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  badgesContainer: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF3FF',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginRight: 5,
  },
  eventBadgeText: {
    fontSize: 10,
    color: '#5D87FF',
    marginLeft: 2,
  },
  taskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginRight: 5,
  },
  taskBadgeText: {
    fontSize: 10,
    color: '#4CAF50',
    marginLeft: 2,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  aiBadgeText: {
    fontSize: 10,
    color: '#9C27B0',
    marginLeft: 2,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeIcon: {
    marginRight: 4,
  },
  dateTimeText: {
    fontSize: 13,
    color: '#888',
  },
  dateTimeTextCompleted: {
    color: '#bbb',
  },
  completeButton: {
    padding: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
});

export default TaskDetailItem;