import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Task } from "@/types/tasks";
import { List } from "@/types/lists";

interface DisplayTaskModalProps {
  visible: boolean;
  onClose: () => void;
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onToggle: (task: Task, isCompleted: boolean) => void;
  availableLists?: List[];
  onCreateNewList?: (listName: string) => Promise<List>;
}

const DisplayTaskModal: React.FC<DisplayTaskModalProps> = ({
  visible,
  onClose,
  task,
  onEdit,
  onDelete,
  onToggle,
  availableLists = [],
  onCreateNewList = async () => ({
    list_id: "1",
    list_name: "Default",
    list_color: "#5D87FF",
  }),
}) => {
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [localTask, setLocalTask] = useState<Task>(task);

  // Format functions
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };
  const formatTime = (timeString: string | undefined): string => {
    if (!timeString) return "N/A";
    // Handles both "14:30:00" and "2025-05-17T14:30:00"
    const time = new Date(`1970-01-01T${timeString}`);
    return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  // Get priority text and color
  const getPriorityInfo = (priority: number | undefined) => {
    if (priority === undefined) return { text: "None", color: "#888" };

    switch (priority) {
      case 1:
        return { text: "Low", color: "#34A853" };
      case 2:
        return { text: "Medium", color: "#FBBC05" };
      case 3:
        return { text: "High", color: "#EA4335" };
      default:
        return { text: "None", color: "#888" };
    }
  };
  // Confirm delete
  const confirmDelete = () => {
    Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          onDelete(task.task_id);
          onClose();
        },
      },
    ]);
  };
  // Handle edit task
  const handleEditTask = (updatedTask: Task) => {
    onEdit(updatedTask);
    setIsEditModalVisible(false);
    onClose();
  };
  // Handlers for task completion toggle
  const handleToggle = () => {
    // Only allow toggling completion for events
    if (localTask.is_event === true) {
      const updatedCompletion = !localTask.is_completed;
      const updatedTask = { ...localTask, is_completed: updatedCompletion };

      // Update local state first
      setLocalTask(updatedTask);
      onToggle(localTask, updatedCompletion); // Inform parent
    }
  };

  const priorityInfo = getPriorityInfo(task.task_priority);

  React.useEffect(() => {
    if (visible) {
      setLocalTask(task);
    }
  }, [visible, task]);

  return (
    <>
      <Modal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={onClose}>
                <Text>Close</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Task Details</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Content */}
            <ScrollView style={styles.modalContent}>
              {/* Task Name */}
              <View style={styles.section}>
                <Text style={styles.taskName}>{localTask.task_name}</Text>
                {/* Task Type Indicator */}
                <View style={styles.taskTypeContainer}>
                  <Ionicons
                    name={localTask.is_event ? "calendar" : "checkbox-outline"}
                    size={16}
                    color="#5D87FF"
                  />
                  <Text style={styles.taskTypeText}>
                    {localTask.is_event ? "Event" : "Task"}
                  </Text>
                </View>
                {/* Completion Status - Only show for events */}
                {localTask.is_event === true && (
                  <TouchableOpacity
                    style={[
                      styles.completionStatus,
                      localTask.is_completed
                        ? styles.completedStatus
                        : styles.pendingStatus,
                    ]}
                    onPress={handleToggle}
                  >
                    <Ionicons
                      name={
                        localTask.is_completed
                          ? "checkmark-circle"
                          : "ellipse-outline"
                      }
                      size={18}
                      color={localTask.is_completed ? "#34A853" : "#666"}
                    />
                    <Text
                      style={
                        localTask.is_completed
                          ? styles.completedText
                          : styles.pendingText
                      }
                    >
                      {localTask.is_completed ? "Completed" : "Pending"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Description */}
              {localTask.task_description && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Description</Text>
                  <Text style={styles.sectionText}>
                    {localTask.task_description}
                  </Text>
                </View>
              )}

              {/*Dates and Times */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Schedule</Text>
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#5D87FF"
                    />
                    <Text style={styles.infoLabel}>Start</Text>
                    <Text style={styles.infoValue}>
                      {formatDate(localTask.task_start_date)}
                    </Text>
                    <Text style={styles.infoValue}>
                      {formatTime(localTask.task_start_time)}
                    </Text>
                  </View>
                  <View style={styles.infoSeparator} />
                  <View style={styles.infoItem}>
                    <Ionicons name="calendar" size={20} color="#5D87FF" />
                    <Text style={styles.infoLabel}>End</Text>
                    <Text style={styles.infoValue}>
                      {formatDate(localTask.task_end_date)}
                    </Text>
                    <Text style={styles.infoValue}>
                      {formatTime(localTask.task_end_time)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Priority and Energy Level */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Task Properties</Text>
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Ionicons name="flag-outline" size={20} color="#5D87FF" />
                    <Text style={styles.infoLabel}>Priority</Text>
                    <View
                      style={[
                        styles.priorityBadge,
                        { backgroundColor: priorityInfo.color + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          { color: priorityInfo.color },
                        ]}
                      >
                        {priorityInfo.text}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.infoSeparator} />
                  <View style={styles.infoItem}>
                    <Ionicons
                      name="battery-charging-outline"
                      size={20}
                      color="#5D87FF"
                    />
                    <Text style={styles.infoLabel}>Energy</Text>
                    <Text style={styles.infoValue}>
                      {localTask.task_energy_level || "N/A"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Location if available */}
              {localTask.task_location && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Location</Text>
                  <View style={styles.locationContainer}>
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color="#5D87FF"
                    />
                    <Text style={styles.locationText}>
                      {localTask.task_location}
                    </Text>
                  </View>
                </View>
              )}

              {/* Attendees if available */}
              {localTask.task_attendees &&
                localTask.task_attendees.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Attendees</Text>
                    {localTask.task_attendees.map((attendee, index) => (
                      <View key={index} style={styles.attendeeItem}>
                        <Ionicons
                          name="person-outline"
                          size={18}
                          color="#5D87FF"
                        />
                        <Text style={styles.attendeeText}>{attendee}</Text>
                      </View>
                    ))}
                  </View>
                )}
              {/* Reminder */}
              <View style={styles.section}>
                <View style={styles.reminderRow}>
                  <Ionicons
                    name={
                      localTask.task_reminder
                        ? "notifications"
                        : "notifications-outline"
                    }
                    size={20}
                    color="#5D87FF"
                  />
                  <Text style={styles.reminderText}>
                    {localTask.task_reminder ? "Reminder set" : "No reminder"}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.actionButtonContainer}>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={confirmDelete}
                >
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => {
                    onEdit(localTask);
                    onClose();
                  }}
                >
                  <Ionicons name="create-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  taskName: {
    fontSize: 22,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  completionStatus: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  completedStatus: {
    backgroundColor: "#E8F5E9",
  },
  pendingStatus: {
    backgroundColor: "#F5F5F5",
  },
  completedText: {
    color: "#34A853",
    fontWeight: "500",
    marginLeft: 4,
    fontSize: 14,
  },
  completedButton: {
    backgroundColor: "#4CAF50",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  pendingButton: {
    backgroundColor: "#f39c12",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },

  pendingText: {
    color: "#666",
    fontWeight: "500",
    marginLeft: 4,
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    color: "#333",
    lineHeight: 22,
  },
  taskTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  taskTypeText: {
    fontSize: 14,
    color: "#5D87FF",
    marginLeft: 4,
    fontWeight: "500",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    overflow: "hidden",
  },
  infoItem: {
    flex: 1,
    padding: 12,
    alignItems: "center",
  },
  infoSeparator: {
    width: 1,
    backgroundColor: "#eee",
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  priorityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  priorityText: {
    fontSize: 14,
    fontWeight: "500",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 12,
  },
  locationText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#333",
  },
  attendeeItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  attendeeText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#333",
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 12,
  },
  reminderText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#333",
  },
  actionButtons: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  actionButtonContainer: {
    paddingBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  deleteButton: {
    backgroundColor: "#FF4D4F",
  },
  editButton: {
    backgroundColor: "#5D87FF",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
});

export default DisplayTaskModal;
