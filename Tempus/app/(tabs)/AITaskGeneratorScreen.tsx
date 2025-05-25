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
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
// Import as fallback data
import defaultHealthData from "../../Analyzed_Health.json";

interface AITask {
  name: string;
  energy_demand: string;
  frequency: number;
  duration_minutes: number;
}

interface HealthData {
  days?: any;
  monthly_avg?: any;
  analysis?: any;
}

export default function AITaskGeneratorScreen() {
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Health data state
  const [uploadedHealthData, setUploadedHealthData] =
    useState<HealthData | null>(null);
  const [healthDataFileName, setHealthDataFileName] = useState<string>("");
  const [isUploadingHealth, setIsUploadingHealth] = useState(false);

  // Current task being added
  const [currentTaskName, setCurrentTaskName] = useState("");
  const [currentEnergyDemand, setCurrentEnergyDemand] = useState("50");
  const [currentFrequency, setCurrentFrequency] = useState("1");
  const [currentDuration, setCurrentDuration] = useState("30");

  // Upload health data file
  const uploadHealthData = async () => {
    try {
      setIsUploadingHealth(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];

        // Validate file type
        if (!file.name?.endsWith(".json")) {
          Alert.alert("Error", "Please select a JSON file");
          return;
        }

        // Read and parse the file
        const fileContent = await FileSystem.readAsStringAsync(file.uri);
        const parsedData = JSON.parse(fileContent);

        // Basic validation of health data structure
        if (
          !parsedData.days &&
          !parsedData.monthly_avg &&
          !parsedData.analysis
        ) {
          Alert.alert(
            "Invalid File",
            "The selected file doesn't appear to be a valid health data file. Please ensure it contains 'days', 'monthly_avg', or 'analysis' data."
          );
          return;
        }

        setUploadedHealthData(parsedData);
        setHealthDataFileName(file.name);

        Alert.alert(
          "Success",
          `Health data file "${file.name}" uploaded successfully!`
        );
      }
    } catch (error) {
      console.error("Error uploading health data:", error);
      Alert.alert(
        "Error",
        "Failed to upload health data file. Please ensure the file is a valid JSON format."
      );
    } finally {
      setIsUploadingHealth(false);
    }
  };

  // Clear uploaded health data
  const clearHealthData = () => {
    Alert.alert(
      "Clear Health Data",
      "Are you sure you want to remove the uploaded health data? The app will use default health data instead.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            setUploadedHealthData(null);
            setHealthDataFileName("");
          },
        },
      ]
    );
  };

  // Get health data (uploaded or default)
  const getHealthData = (): HealthData => {
    return uploadedHealthData || defaultHealthData;
  };

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

    const newTask: AITask = {
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

  // Generate schedule using AI
  const generateSchedule = async () => {
    if (tasks.length === 0) {
      Alert.alert(
        "Error",
        "Please add at least one task before generating a schedule"
      );
      return;
    }

    setIsGenerating(true);
    console.log("Generating schedule with tasks:", tasks);

    try {
      // Get JWT token for authentication
      const token = await AuthService.getJWTToken();

      if (!token) {
        Alert.alert("Error", "Authentication required. Please sign in again.");
        setIsGenerating(false);
        return;
      }

      // Use uploaded health data or default
      const healthData = getHealthData();
      console.log(
        "Using health data:",
        uploadedHealthData ? "Uploaded file" : "Default data"
      );

      // Call Lambda function to generate AI schedule and save to database
      const response = await fetch(
        "https://sazlhtbr90.execute-api.us-east-1.amazonaws.com/TempusHealthHandler",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            days: healthData.days,
            monthly_avg: healthData.monthly_avg,
            analysis: healthData.analysis,
            tasks: tasks,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Lambda response:", result);

      // Lambda handles both scheduling and saving, so we just need to check for success
      Alert.alert(
        "Success!",
        result.message ||
          "Your AI-powered schedule has been generated and added to your calendar.",
        [
          {
            text: "View Calendar",
            onPress: () => router.push("/(tabs)/Calendar"),
          },
          {
            text: "OK",
            style: "default",
          },
        ]
      );

      // Clear tasks after successful generation
      setTasks([]);
    } catch (error) {
      console.error("Error generating schedule:", error);
      Alert.alert(
        "Error",
        "Failed to generate and save schedule. Please check your internet connection and try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Energy level color helper
  const getEnergyColor = (energy: string) => {
    const energyNum = parseInt(energy);
    if (energyNum <= 25) return "#4CAF50"; // Green for low energy
    if (energyNum <= 50) return "#FF9800"; // Orange for medium energy
    if (energyNum <= 75) return "#F44336"; // Red for high energy
    return "#9C27B0"; // Purple for very high energy
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Task Generator</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Description */}
        <View style={styles.descriptionCard}>
          <Ionicons
            name="bulb-outline"
            size={24}
            color="#5D87FF"
            style={styles.descriptionIcon}
          />
          <Text style={styles.descriptionText}>
            Create tasks and let AI schedule them optimally based on your energy
            levels and preferences.
          </Text>
        </View>

        {/* NEW: Health Data Upload Section */}
        <View style={styles.healthDataCard}>
          <Text style={styles.sectionTitle}>Health Data (Optional)</Text>

          {!uploadedHealthData ? (
            <View style={styles.uploadContainer}>
              <View style={styles.uploadInfo}>
                <Ionicons name="document-outline" size={20} color="#666" />
                <Text style={styles.uploadInfoText}>
                  Upload your health data JSON file for more personalized
                  scheduling, or use default data.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.uploadButton}
                onPress={uploadHealthData}
                disabled={isUploadingHealth}
              >
                {isUploadingHealth ? (
                  <ActivityIndicator color="#5D87FF" size="small" />
                ) : (
                  <Ionicons
                    name="cloud-upload-outline"
                    size={20}
                    color="#5D87FF"
                  />
                )}
                <Text style={styles.uploadButtonText}>
                  {isUploadingHealth ? "Uploading..." : "Upload Health Data"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.uploadedContainer}>
              <View style={styles.uploadedInfo}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <View style={styles.uploadedTextContainer}>
                  <Text style={styles.uploadedFileName}>
                    {healthDataFileName}
                  </Text>
                  <Text style={styles.uploadedStatus}>
                    Health data uploaded successfully
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearHealthData}
              >
                <Ionicons name="trash-outline" size={18} color="#FF5252" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Add Task Form - existing code remains the same */}
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
                placeholder="Custom"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Frequency (times per week)</Text>
            <View style={styles.frequencyContainer}>
              {[1, 2, 3, 4, 5, 6, 7].map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.frequencyButton,
                    currentFrequency === freq.toString() &&
                      styles.frequencyButtonSelected,
                  ]}
                  onPress={() => setCurrentFrequency(freq.toString())}
                >
                  <Text
                    style={[
                      styles.frequencyButtonText,
                      currentFrequency === freq.toString() &&
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
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add Task</Text>
          </TouchableOpacity>
        </View>

        {/* Tasks List - existing code remains the same */}
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
                        { backgroundColor: getEnergyColor(task.energy_demand) },
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
  healthDataCard: {
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
  uploadContainer: {
    gap: 12,
  },
  uploadInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    backgroundColor: "#f1f4fe",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#5D87FF",
  },
  uploadInfoText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#5D87FF",
    backgroundColor: "#f8f9ff",
  },
  uploadButtonText: {
    color: "#5D87FF",
    fontSize: 14,
    fontWeight: "500",
  },
  uploadedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#f0f8f0",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#4CAF50",
  },
  uploadedInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  uploadedTextContainer: {
    flex: 1,
  },
  uploadedFileName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  uploadedStatus: {
    fontSize: 12,
    color: "#4CAF50",
    marginTop: 2,
  },
  clearButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#fff",
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
