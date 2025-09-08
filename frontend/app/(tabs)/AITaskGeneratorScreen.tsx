// AITaskGeneratorScreen.tsx (Updated with Modal - Original Design Preserved)
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { AuthService } from "../../services/AuthService";
import { useApi } from "../../context/ApiContext";
import AIScheduleReviewModal from "../../components/AiTaskScheduler/AIScheduleReviewModal";
import { AITaskInput, AIGeneratedTask, AITaskForReview, BaseTask } from "../../types/tasks";


interface AIScheduleResponse {
  success: boolean;
  scheduledTasks: AIGeneratedTask[];
  message: string;
}

export default function AITaskGeneratorScreen() {
  const [tasks, setTasks] = useState<AITaskInput[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Current task being added
  const [currentTaskName, setCurrentTaskName] = useState("");
  const [currentEnergyDemand, setCurrentEnergyDemand] = useState("50");
  const [currentFrequency, setCurrentFrequency] = useState("1");
  const [currentDuration, setCurrentDuration] = useState("30");

  // New state for modal integration
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [aiSuggestedTasks, setAiSuggestedTasks] = useState<AITaskForReview[]>([]);
  const [feedbackAttempts, setFeedbackAttempts] = useState(0);
  const [isProcessingFeedback, setIsProcessingFeedback] = useState(false);
  const [previousFeedback, setPreviousFeedback] = useState<string[]>([]);

  const { refreshTasks, addTaskArr } = useApi();


  // Add a new task to the list
  const addTask = () => {
    if (!currentTaskName.trim()) {
      Alert.alert("Error", "Please enter a task name");
      return;
    }

    const frequency = parseInt(currentFrequency);
    const energyDemand = parseInt(currentEnergyDemand);
    const duration = parseInt(currentDuration);

    if (isNaN(frequency) || frequency < 1 || frequency > 7) {
      Alert.alert("Error", "Frequency must be between 1 and 7");
      return;
    }

    if (isNaN(energyDemand) || energyDemand < 0 || energyDemand > 100) {
      Alert.alert("Error", "Energy demand must be between 0 and 100");
      return;
    }

    if (isNaN(duration) || duration < 5 || duration > 480) {
      Alert.alert(
        "Error",
        "Duration must be between 5 and 480 minutes (8 hours)"
      );
      return;
    }

    const newTask: AITaskInput = {
      name: currentTaskName.trim(),
      energy_demand: currentEnergyDemand,
      frequency: frequency,
      duration_minutes: duration,
    };

    setTasks([...tasks, newTask]);

    // Clear form
    setCurrentTaskName("");
    setCurrentEnergyDemand("50");
    setCurrentFrequency("1");
    setCurrentDuration("30");
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
  };

  // Remove a task from the list
  const removeTask = (index: number) => {
    const updatedTasks = tasks.filter((_, i) => i !== index);
    setTasks(updatedTasks);
  };

  // Modified generate schedule function - shows modal instead of immediate save
  const generateSchedule = async () => {
    if (tasks.length === 0) {
      Alert.alert(
        "Error",
        "Please add at least one task before generating a schedule"
      );
      return;
    }

    setIsGenerating(true);
    setFeedbackAttempts(1); // Reset attempts
    console.log("Generating schedule with tasks:", tasks);

    try {
      // Get JWT token for authentication
      const token = await AuthService.getJWTToken();

      if (!token) {
        Alert.alert("Error", "Authentication required. Please sign in again.");
        setIsGenerating(false);
        return;
      }

      const userEmail = await AuthService.getUserEmail();
      const userId = userEmail || "unknown-user";

      // Call Lambda function to generate AI schedule (but don't save yet)
      const response = await callLambdaForSchedule(
        tasks,
        userId,
        token,
        [],
        false // Don't save to DB yet
      );

      if (response.success && response.scheduledTasks) {
        // Convert to AITaskForReview format for the modal
        const tasksForReview: AITaskForReview[] = response.scheduledTasks.map((task, index) => ({
          ...task,
          isSelected: true, // Default to selected
          temp_id: `temp_${index}_${Date.now()}`, // Unique temp ID
        }));
        setAiSuggestedTasks(tasksForReview);
        setScheduleModalVisible(true);
      } else {
        Alert.alert("Error", response.message || "Failed to generate schedule");
      }
    } catch (error) {
      console.error("Error generating schedule:", error);
      Alert.alert(
        "Error",
        "Failed to generate schedule. Please check your internet connection and try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Call Lambda for schedule generation
  const callLambdaForSchedule = async (
    taskList: AITaskInput[],
    userId: string,
    token: string,
    feedbackHistory: string[],
    saveToDb: boolean = false
  ): Promise<AIScheduleResponse> => {
    const response = await fetch(
      "https://sazlhtbr90.execute-api.us-east-1.amazonaws.com/TempusHealthHandler",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tasks: taskList,
          userId: userId,
          feedback: feedbackHistory,
          saveToDatabase: saveToDb, // Control whether Lambda saves to DB
          generateOnly: !saveToDb,  // Just generate, don't save
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("Lambda response:", result);

    // Parse the response to extract scheduled tasks
    // Adjust this based on your actual Lambda response structure
    return {
      success: true,
      scheduledTasks: result.scheduledTasks || result.tasks || [],
      message: result.message || "Schedule generated successfully",
    };
  };

  // Handle accepting the schedule - schedule ALL tasks from the modal
  const handleAcceptSchedule = async () => {
    try {
      // Convert ALL tasks in the modal to BaseTask format
      const tasksToSchedule: BaseTask[] = aiSuggestedTasks.map(convertToBaseTask);
      
      // Add all tasks using addTaskArr
      await addTaskArr(tasksToSchedule);
      
      // Refresh tasks to show the new ones
      await refreshTasks();
      
      Alert.alert(
        "Success!",
        `All ${aiSuggestedTasks.length} tasks have been added to your schedule.`,
        [
          {
            text: "View Calendar",
            onPress: () => {
              setScheduleModalVisible(false);
              router.push("/(tabs)/Calendar");
            },
          },
          {
            text: "OK",
            style: "default",
            onPress: () => {
              setScheduleModalVisible(false);
              setTasks([]); // Clear original input tasks
              setAiSuggestedTasks([]); // Clear modal tasks
              setPreviousFeedback([]); // Clear feedback history
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error scheduling all tasks:", error);
      Alert.alert("Error", "Failed to schedule tasks. Please try again.");
    }
  };

  // Handle requesting changes with feedback
  const handleRequestChanges = async (tasksWithMessages: AITaskForReview[]) => {
    if (feedbackAttempts >= 3) {
      Alert.alert(
        "Maximum Attempts",
        "You have reached the maximum number of feedback attempts."
      );
      return;
    }

    // Extract feedback messages from tasks
    const feedbackMessages = tasksWithMessages
      .filter(task => task.task_message && task.task_message.trim())
      .map(task => `${task.task_name}: ${task.task_message}`);
      
    const feedbackMessage = feedbackMessages.join('; ');

    setIsProcessingFeedback(true);
    setFeedbackAttempts(prev => prev + 1);
    setPreviousFeedback([...previousFeedback, feedbackMessage]);

    try {
      const token = await AuthService.getJWTToken();
      const userEmail = await AuthService.getUserEmail();
      const userId = userEmail || "unknown-user";

      // Convert remaining AI tasks back to input format for rescheduling
      const remainingInputTasks: AITaskInput[] = aiSuggestedTasks.map(task => ({
        name: task.task_name,
        energy_demand: task.task_energy_level?.toString() || "50",
        frequency: 1, // Default to 1 since we don't store this in generated tasks
        duration_minutes: task.task_duration_minutes,
        notes: task.task_message || undefined
      }));

      console.log("Remaining tasks for rescheduling:", remainingInputTasks);

      // Call Lambda with feedback
      const response = await callLambdaForSchedule(
        remainingInputTasks,
        userId,
        token!,
        [...previousFeedback, feedbackMessage],
        false // Don't save yet
      );

      if (response.success && response.scheduledTasks) {
        const tasksForReview: AITaskForReview[] = response.scheduledTasks.map((task, index) => ({
          ...task,
          isSelected: true,
          temp_id: `temp_${index}_${Date.now()}`,
        }));
        setAiSuggestedTasks(tasksForReview);
      } else {
        Alert.alert("Error", response.message || "Failed to update schedule");
      }
    } catch (error) {
      console.error("Error processing feedback:", error);
      Alert.alert("Error", "Failed to update schedule. Please try again.");
    } finally {
      setIsProcessingFeedback(false);
    }
  };

  // Convert AI generated task to BaseTask format
  const convertToBaseTask = (aiTask: AITaskForReview): BaseTask => {
    return {
      task_name: aiTask.task_name,
      task_description: aiTask.task_description,
      task_start_date: aiTask.task_start_date,
      task_end_date: aiTask.task_end_date,
      task_start_time: aiTask.task_start_time,
      task_end_time: aiTask.task_end_time,
      task_energy_level: aiTask.task_energy_level,
      is_ai_generated: true,
      is_event: false,
      is_completed: false,
    };
  };

  // Handle scheduling selected tasks
  const handleScheduleSelected = async (selectedTasks: AITaskForReview[]) => {
    try {
      // Convert selected tasks to BaseTask format
      const tasksToSchedule: BaseTask[] = selectedTasks.map(convertToBaseTask);
      
      // Add tasks using addTaskArr
      await addTaskArr(tasksToSchedule);
      
      // Remove scheduled tasks from the modal list
      const remainingTasks = aiSuggestedTasks.filter(task => 
        !selectedTasks.some(selected => selected.temp_id === task.temp_id)
      );
      setAiSuggestedTasks(remainingTasks);
      
      // Refresh tasks to show the new ones
      await refreshTasks();
      
      Alert.alert(
        "Success!",
        `${selectedTasks.length} task(s) have been added to your schedule.`,
        [
          {
            text: "View Calendar",
            onPress: () => {
              setScheduleModalVisible(false);
              router.push("/(tabs)/Calendar");
            },
          },
          {
            text: "OK",
            style: "default",
          },
        ]
      );
    } catch (error) {
      console.error("Error scheduling selected tasks:", error);
      Alert.alert("Error", "Failed to schedule tasks. Please try again.");
    }
  };

  // Handle tasks update from modal
  const handleTasksUpdate = (updatedTasks: AITaskForReview[]) => {
    setAiSuggestedTasks(updatedTasks);
  };

  // Handle closing the modal
  const handleCloseModal = () => {
    Alert.alert(
      "Discard Schedule?",
      "Are you sure you want to discard the AI-generated schedule?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            setScheduleModalVisible(false);
            setAiSuggestedTasks([]);
            setFeedbackAttempts(0);
            setPreviousFeedback([]);
          },
        },
      ]
    );
  };

  // Get energy color based on value
  const getEnergyColor = (energy: string) => {
    const value = parseInt(energy);
    if (value <= 25) return "#4CAF50"; // Green for low energy
    if (value <= 50) return "#FFC107"; // Yellow for medium
    if (value <= 75) return "#FF9800"; // Orange for high
    return "#F44336"; // Red for very high
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f1f4fe" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/(tabs)/Calendar")}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Schedule Generator</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Description Card */}
        <View style={styles.descriptionCard}>
          <View style={styles.descriptionIcon}>
            <Ionicons name="sparkles" size={24} color="#5D87FF" />
          </View>
          <Text style={styles.descriptionText}>
            Add your tasks and let AI optimize your schedule based on your
            energy patterns and preferences
          </Text>
        </View>

        {/* Add Task Form */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Add New Task</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Task Name</Text>
            <TextInput
              style={styles.textInput}
              value={currentTaskName}
              onChangeText={setCurrentTaskName}
              placeholder="e.g., Workout, Study, Reading..."
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Duration (minutes)</Text>
            <View style={styles.durationContainer}>
              <View style={styles.durationButtons}>
                {["15", "30", "45", "60", "90", "120"].map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.durationButton,
                      currentDuration === duration &&
                        styles.durationButtonSelected,
                    ]}
                    onPress={() => setCurrentDuration(duration)}
                  >
                    <Text
                      style={[
                        styles.durationButtonText,
                        currentDuration === duration &&
                          styles.durationButtonTextSelected,
                      ]}
                    >
                      {formatDuration(parseInt(duration))}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.durationInput}
                value={currentDuration}
                onChangeText={setCurrentDuration}
                keyboardType="numeric"
                placeholder="Custom minutes"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Energy Demand (0-100)</Text>
            <View style={styles.energyContainer}>
              <View style={styles.energyButtons}>
                {["0", "25", "50", "75", "100"].map((energy) => (
                  <TouchableOpacity
                    key={energy}
                    style={[
                      styles.energyButton,
                      currentEnergyDemand === energy &&
                        styles.energyButtonSelected,
                      {
                        backgroundColor:
                          currentEnergyDemand === energy
                            ? getEnergyColor(energy)
                            : "#f0f0f0",
                      },
                    ]}
                    onPress={() => setCurrentEnergyDemand(energy)}
                  >
                    <Text
                      style={[
                        styles.energyButtonText,
                        currentEnergyDemand === energy &&
                          styles.energyButtonTextSelected,
                      ]}
                    >
                      {energy}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.energyInput}
                value={currentEnergyDemand}
                onChangeText={setCurrentEnergyDemand}
                keyboardType="numeric"
                placeholder="0-100"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Frequency (times per week)</Text>
            <View style={styles.frequencyContainer}>
              {["1", "2", "3", "4", "5", "6", "7"].map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.frequencyButton,
                    currentFrequency === freq && styles.frequencyButtonSelected,
                  ]}
                  onPress={() => setCurrentFrequency(freq)}
                >
                  <Text
                    style={[
                      styles.frequencyButtonText,
                      currentFrequency === freq &&
                        styles.frequencyButtonTextSelected,
                    ]}
                  >
                    {freq}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.addButton} onPress={addTask}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add Task</Text>
          </TouchableOpacity>
        </View>

        {/* Tasks List */}
        {tasks.length > 0 && (
          <View style={styles.tasksCard}>
            <Text style={styles.sectionTitle}>
              Tasks to Schedule ({tasks.length})
            </Text>
            {tasks.map((task, index) => (
              <View key={index} style={styles.taskItem}>
                <View style={styles.taskContent}>
                  <Text style={styles.taskName}>{task.name}</Text>
                  <View style={styles.taskDetails}>
                    <View
                      style={[
                        styles.energyBadge,
                        {
                          backgroundColor: getEnergyColor(task.energy_demand),
                        },
                      ]}
                    >
                      <Text style={styles.energyBadgeText}>
                        {task.energy_demand}
                      </Text>
                    </View>
                    <Text style={styles.frequencyText}>
                      {task.frequency}x/week
                    </Text>
                    {task.duration_minutes && (
                      <View style={styles.durationBadge}>
                        <Ionicons name="time-outline" size={12} color="#666" />
                        <Text style={styles.durationText}>
                          {formatDuration(task.duration_minutes)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeTask(index)}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF5252" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Generate Button */}
        <TouchableOpacity
          style={[
            styles.generateButton,
            (tasks.length === 0 || isGenerating) &&
              styles.generateButtonDisabled,
          ]}
          onPress={generateSchedule}
          disabled={tasks.length === 0 || isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="sparkles" size={20} color="#fff" />
          )}
          <Text style={styles.generateButtonText}>
            {isGenerating ? "Generating..." : "Generate AI Schedule"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* AI Schedule Review Modal */}
      <AIScheduleReviewModal
        visible={scheduleModalVisible}
        scheduledTasks={aiSuggestedTasks}
        onAccept={handleAcceptSchedule}
        onRequestChanges={handleRequestChanges}
        onClose={handleCloseModal}
        isLoading={isProcessingFeedback}
        attemptNumber={feedbackAttempts}
        onTasksUpdate={handleTasksUpdate}
        onScheduleSelected={handleScheduleSelected}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f4fe",
  },
  backButton: {
    padding: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  descriptionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  descriptionIcon: {
    marginRight: 12,
  },
  descriptionText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tasksCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  energyContainer: {
    gap: 12,
  },
  energyButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  energyButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    minWidth: 50,
    alignItems: "center",
  },
  energyButtonSelected: {
    transform: [{ scale: 1.05 }],
  },
  energyButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  energyButtonTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  energyInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    textAlign: "center",
  },
  frequencyContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  frequencyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  frequencyButtonSelected: {
    backgroundColor: "#5D87FF",
    transform: [{ scale: 1.1 }],
  },
  frequencyButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
  },
  frequencyButtonTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  addButton: {
    backgroundColor: "#5D87FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  taskContent: {
    flex: 1,
  },
  taskName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  taskDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  energyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  energyBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  frequencyText: {
    fontSize: 12,
    color: "#666",
  },
  removeButton: {
    padding: 8,
  },
  generateButton: {
    backgroundColor: "#5D87FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 32,
  },
  generateButtonDisabled: {
    backgroundColor: "#ccc",
  },
  generateButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  durationContainer: {
    gap: 12,
  },
  durationButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  durationButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    minWidth: 50,
    alignItems: "center",
  },
  durationButtonSelected: {
    backgroundColor: "#5D87FF",
    transform: [{ scale: 1.05 }],
  },
  durationButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
  },
  durationButtonTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  durationInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    textAlign: "center",
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  durationText: {
    fontSize: 10,
    color: "#666",
    fontWeight: "500",
  },
});