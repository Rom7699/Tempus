// AIScheduleReviewModal.tsx (Improved Version)
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import { AITaskForReview } from "../../types/tasks";

interface AIScheduleReviewModalProps {
  visible: boolean;
  scheduledTasks: AITaskForReview[];
  onAccept: () => void;
  onRequestChanges: (tasksWithMessages: AITaskForReview[]) => void;
  onClose: () => void;
  isLoading: boolean;
  attemptNumber: number;
  onTasksUpdate: (updatedTasks: AITaskForReview[]) => void;
  onScheduleSelected: (tasks: AITaskForReview[]) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function AIScheduleReviewModal({
  visible,
  scheduledTasks,
  onAccept,
  onRequestChanges,
  onClose,
  isLoading,
  attemptNumber,
  onTasksUpdate,
  onScheduleSelected,
}: AIScheduleReviewModalProps) {
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [taskMessage, setTaskMessage] = useState("");
  const [localTasks, setLocalTasks] = useState<AITaskForReview[]>(scheduledTasks);

  // Update local tasks when props change
  React.useEffect(() => {
    setLocalTasks(scheduledTasks.map(task => ({ ...task, isSelected: task.isSelected ?? true })));
  }, [scheduledTasks]);

  const handleReschedule = () => {
    if (attemptNumber >= 3) {
      Alert.alert(
        "Maximum attempts reached",
        "You've reached the maximum number of feedback attempts. Please accept the current schedule or start over.",
        [{ text: "OK" }]
      );
      return;
    }

    // Check if any tasks have messages
    const tasksWithMessages = localTasks.filter(task => task.task_message && task.task_message.trim());
    
    if (tasksWithMessages.length === 0) {
      Alert.alert(
        "Add Instructions",
        "Please add messages to tasks you want to change by tapping the message icon next to them.",
        [{ text: "OK" }]
      );
      return;
    }

    // Send tasks with their messages for rescheduling
    onRequestChanges(localTasks);
  };

  const toggleTaskSelection = (index: number) => {
    const updatedTasks = localTasks.map((task, i) => ({
      ...task,
      isSelected: i === index ? !task.isSelected : task.isSelected
    }));
    setLocalTasks(updatedTasks);
    onTasksUpdate(updatedTasks);
  };

  const openMessageModal = (index: number) => {
    const task = localTasks[index];
    setTaskMessage(task.task_message || "");
    setEditingTaskIndex(index);
    setShowMessageModal(true);
  };

  const saveTaskMessage = () => {
    if (editingTaskIndex !== null) {
      const updatedTasks = localTasks.map((task, i) => ({
        ...task,
        task_message: i === editingTaskIndex ? taskMessage : task.task_message
      }));
      setLocalTasks(updatedTasks);
      onTasksUpdate(updatedTasks);
      setShowMessageModal(false);
      setEditingTaskIndex(null);
      setTaskMessage("");
    }
  };

  const cancelTaskMessage = () => {
    setShowMessageModal(false);
    setEditingTaskIndex(null);
    setTaskMessage("");
  };

  const handleScheduleSelected = () => {
    const selectedTasks = localTasks.filter(task => task.isSelected);
    if (selectedTasks.length === 0) {
      Alert.alert("No Tasks Selected", "Please select at least one task to schedule.");
      return;
    }
    onScheduleSelected(selectedTasks);
  };

  const getSelectedCount = () => {
    return localTasks.filter(task => task.isSelected).length;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatTimeRange = (startTime: string, endTime: string) => {
    // Display in 24-hour format as requested
    return `${startTime} - ${endTime}`;
  };

  const calculateDuration = (startTime: string, endTime: string) => {
    try {
      const [startHour, startMin] = startTime.split(":").map(Number);
      const [endHour, endMin] = endTime.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const duration = endMinutes - startMinutes;
      
      if (duration < 60) {
        return `${duration}min`;
      } else {
        const hours = Math.floor(duration / 60);
        const mins = duration % 60;
        return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
      }
    } catch {
      return "";
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>AI Schedule Review</Text>
            <Text style={styles.attemptIndicator}>
              Attempt {attemptNumber} of 3
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5D87FF" />
            <Text style={styles.loadingText}>
              {attemptNumber > 1
                ? "Rescheduling based on your instructions..."
                : "Generating your schedule..."}
            </Text>
          </View>
        ) : (
          <>
            {/* Instructions Card */}
            <View style={styles.instructionCard}>
              <Ionicons name="information-circle" size={20} color="#5D87FF" />
              <Text style={styles.instructionText}>
                Select tasks to schedule and add messages for specific scheduling preferences
              </Text>
            </View>

            {/* Task List */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.tasksContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    Tasks ({localTasks.length})
                  </Text>
                  <Text style={styles.selectionCount}>
                    {getSelectedCount()} selected
                  </Text>
                </View>

                {localTasks.map((task, index) => (
                  <View key={index} style={styles.taskItem}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => toggleTaskSelection(index)}
                    >
                      <Ionicons
                        name={task.isSelected ? "checkbox" : "square-outline"}
                        size={22}
                        color={task.isSelected ? "#5D87FF" : "#ccc"}
                      />
                    </TouchableOpacity>

                    <View style={styles.taskContent}>
                      <Text style={styles.taskName} numberOfLines={1}>
                        {task.task_name}
                      </Text>
                      <View style={styles.taskInfo}>
                        <Text style={styles.taskDate}>
                          {formatDate(task.task_start_date)}
                        </Text>
                        <Text style={styles.separator}>•</Text>
                        <Text style={styles.taskTime}>
                          {formatTimeRange(task.task_start_time, task.task_end_time)}
                        </Text>
                        <Text style={styles.separator}>•</Text>
                        <Text style={styles.taskDuration}>
                          {calculateDuration(task.task_start_time, task.task_end_time)}
                        </Text>
                      </View>
                      {task.task_message && (
                        <View style={styles.messageIndicator}>
                          <Ionicons name="chatbubble" size={12} color="#5D87FF" />
                          <Text style={styles.messagePreview} numberOfLines={1}>
                            {task.task_message}
                          </Text>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.messageButton}
                      onPress={() => openMessageModal(index)}
                    >
                      <Ionicons
                        name={task.task_message ? "chatbubble" : "chatbubble-outline"}
                        size={20}
                        color={task.task_message ? "#5D87FF" : "#999"}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {getSelectedCount() > 0 && (
                <TouchableOpacity
                  style={styles.scheduleSelectedButton}
                  onPress={handleScheduleSelected}
                >
                  <Ionicons name="calendar" size={20} color="#fff" />
                  <Text style={styles.scheduleSelectedButtonText}>
                    Schedule Selected ({getSelectedCount()})
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.bottomButtons}>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={onAccept}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.acceptButtonText}>Accept All</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.rescheduleButton,
                    attemptNumber >= 3 && styles.rescheduleButtonDisabled,
                  ]}
                  onPress={handleReschedule}
                  disabled={attemptNumber >= 3}
                >
                  <Ionicons 
                    name="refresh" 
                    size={20} 
                    color={attemptNumber >= 3 ? "#999" : "#5D87FF"} 
                  />
                  <Text 
                    style={[
                      styles.rescheduleButtonText,
                      attemptNumber >= 3 && styles.rescheduleButtonTextDisabled,
                    ]}
                  >
                    Reschedule
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* Message Edit Modal (Popup) */}
        <Modal
          visible={showMessageModal}
          transparent={true}
          animationType="fade"
          onRequestClose={cancelTaskMessage}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.messageModalOverlay}
          >
            <TouchableOpacity 
              style={styles.messageModalOverlay} 
              activeOpacity={1} 
              onPress={cancelTaskMessage}
            >
              <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                <View style={styles.messageModalContent}>
                  <View style={styles.messageModalHeader}>
                    <Text style={styles.messageModalTitle}>
                      Add Scheduling Instructions
                    </Text>
                    <TouchableOpacity onPress={cancelTaskMessage}>
                      <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>

                  {editingTaskIndex !== null && (
                    <View style={styles.messageModalTask}>
                      <Ionicons name="create-outline" size={16} color="#5D87FF" />
                      <Text style={styles.messageModalTaskName} numberOfLines={1}>
                        {localTasks[editingTaskIndex]?.task_name}
                      </Text>
                    </View>
                  )}

                  <TextInput
                    style={styles.messageModalInput}
                    value={taskMessage}
                    onChangeText={setTaskMessage}
                    placeholder="E.g., Schedule this after lunch, Prefer morning time, Need 30 min break after this task..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    autoFocus
                  />

                  <View style={styles.messageModalButtons}>
                    <TouchableOpacity
                      style={styles.messageModalCancel}
                      onPress={cancelTaskMessage}
                    >
                      <Text style={styles.messageModalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.messageModalSave}
                      onPress={saveTaskMessage}
                    >
                      <Text style={styles.messageModalSaveText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </Modal>
  );
}

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
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  attemptIndicator: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  instructionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F0FF",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  instructionText: {
    flex: 1,
    fontSize: 13,
    color: "#333",
    lineHeight: 18,
  },
  content: {
    flex: 1,
  },
  tasksContainer: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  selectionCount: {
    fontSize: 14,
    fontWeight: "500",
    color: "#5D87FF",
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 12,
  },
  checkbox: {
    paddingTop: 2,
  },
  taskContent: {
    flex: 1,
  },
  taskName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  taskInfo: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  taskDate: {
    fontSize: 13,
    color: "#666",
  },
  taskTime: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  taskDuration: {
    fontSize: 13,
    color: "#5D87FF",
    fontWeight: "500",
  },
  separator: {
    fontSize: 13,
    color: "#ccc",
    marginHorizontal: 6,
  },
  messageIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    backgroundColor: "#f0f4ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  messagePreview: {
    fontSize: 11,
    color: "#5D87FF",
    flex: 1,
  },
  messageButton: {
    padding: 4,
  },
  actionButtons: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 16,
  },
  bottomButtons: {
    flexDirection: "row",
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 10,
    gap: 6,
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  rescheduleButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#5D87FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 10,
    gap: 6,
  },
  rescheduleButtonDisabled: {
    borderColor: "#ccc",
  },
  rescheduleButtonText: {
    color: "#5D87FF",
    fontSize: 16,
    fontWeight: "600",
  },
  rescheduleButtonTextDisabled: {
    color: "#999",
  },
  scheduleSelectedButton: {
    backgroundColor: "#FF9800",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 10,
    gap: 6,
    marginBottom: 12,
  },
  scheduleSelectedButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  
  // Message Modal Styles (Popup)
  messageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  messageModalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: screenWidth * 0.9,
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  messageModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  messageModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  messageModalTask: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  messageModalTaskName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#5D87FF",
    flex: 1,
  },
  messageModalInput: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#f9f9f9",
    minHeight: 100,
    maxHeight: 150,
    color: "#333",
  },
  messageModalButtons: {
    flexDirection: "row",
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  messageModalCancel: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  messageModalCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },
  messageModalSave: {
    flex: 1,
    backgroundColor: "#5D87FF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  messageModalSaveText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});