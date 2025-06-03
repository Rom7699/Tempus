import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import TaskDetailItem from "../NewTaskItem";
import { EmptyTasksView, ErrorView } from "./CalendarStateViews";
import { Task } from "@/types/tasks";

interface TaskSectionProps {
  selectedDate: string;
  tasks: Task[];
  taskLoading: boolean;
  taskError: string | null;
  onTaskPress: (task: Task) => void;
  onAddTask: () => void;
  onRetry: () => void;
}

export const TaskSection: React.FC<TaskSectionProps> = ({
  selectedDate,
  tasks,
  taskLoading,
  taskError,
  onTaskPress,
  onAddTask,
  onRetry,
}) => {
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

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const timeA = a.task_start_time || "00:00";
      const timeB = b.task_start_time || "00:00";

      const [hoursA, minutesA] = timeA.split(":").map(Number);
      const [hoursB, minutesB] = timeB.split(":").map(Number);

      const totalMinutesA = hoursA * 60 + minutesA;
      const totalMinutesB = hoursB * 60 + minutesB;

      return totalMinutesA - totalMinutesB;
    });
  }, [tasks]);

  return (
    <View style={styles.tasksSection}>
      <Text style={styles.sectionTitle}>{formatDateToShort(selectedDate)}</Text>

      {taskError && <ErrorView message={taskError} onRetry={onRetry} />}

      <View style={styles.tasksList}>
        {sortedTasks.map((task) => (
          <TaskDetailItem
            key={task.task_id}
            task={task}
            onPress={onTaskPress}
          />
        ))}

        {tasks.length === 0 && !taskLoading && (
          <EmptyTasksView onAddTask={onAddTask} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
});
