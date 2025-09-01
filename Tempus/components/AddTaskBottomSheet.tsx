import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
  Switch,
  ScrollView,
  Animated,
  PanResponder,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import ListSelectionModal from "./ListSelectionModal";
import GoalSelectionModal from "./GoalSelectionModal";
import { BaseTask, Task, UpdateTaskInput } from "@/types/tasks";
import { List } from "@/types/lists";
import { Goal } from "@/types/goals";
import { useApi } from "@/context/ApiContext";
import { BaseList } from "@/types/lists";
const { height } = Dimensions.get("window");

interface AddTaskBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (task: BaseTask) => Promise<void>; // Optional as we'll use the context by default
  onUpdate?: (task: UpdateTaskInput) => Promise<void>; // For edit mode
  selectedDate?: Date;
  selectedList?: List | null;
  selectedGoal?: Goal | null;
  editTask?: Task | null; // Task to edit (if provided, component will be in edit mode)
}

const AddTaskBottomSheet: React.FC<AddTaskBottomSheetProps> = ({
  visible,
  onClose,
  onSave,
  onUpdate,
  selectedDate,
  selectedList: initialSelectedList,
  selectedGoal: initialSelectedGoal,
  editTask,
}) => {
  // Use the API context
  const { lists, goals, addTask: contextAddTask, updateTask: contextUpdateTask, taskLoading, addList } = useApi();

  // Determine if we're in edit mode
  const isEditMode = !!editTask;

  // Animation values
  const translateY = useRef(new Animated.Value(height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Initialize with selectedDate but keep current time
  const initializeDate = () => {
    const now = new Date(); // Current date and time

    if (selectedDate) {
      // Create a date from selectedDate
      const baseDate = new Date(selectedDate);
      // Set the time components from current time
      baseDate.setHours(now.getHours());
      return baseDate;
    }

    // If no selectedDate, use current date and time
    return now;
  };

  // Initialize end date with selectedDate but one hour later from current time
  const initializeEndDate = () => {
    const date = initializeDate(); // Get the start date with current time
    // Set end time to one hour later
    date.setHours(date.getHours() + 1);
    return date;
  };

  // State for task creation
  const [taskName, setTaskName] = useState("");
  const [taskType, setTaskType] = useState<"event" | "task">("task");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(initializeDate);
  const [endDate, setEndDate] = useState(initializeEndDate);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [location, setLocation] = useState("");
  const [attendees, setAttendees] = useState("");
  const [priority, setPriority] = useState(2); // Default to Medium (2 in database)
  const [energyLevel, setEnergyLevel] = useState(50); // Default to 50%
  const [isSaving, setIsSaving] = useState(false);

  // List selection states
  const [selectedList, setSelectedList] = useState<List | null>(initialSelectedList || null);
  const [showListModal, setShowListModal] = useState(false);

  // Goal selection states
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(initialSelectedGoal || null);
  const [showGoalModal, setShowGoalModal] = useState(false);

  // UI States
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"date" | "time">("date");
  const [activeField, setActiveField] = useState<
    "startDate" | "startTime" | "endDate" | "endTime"
  >("startDate");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null); // For iOS picker
  const [error, setError] = useState<string | null>(null);

  // Reset state when bottom sheet becomes visible or selectedDate changes
  useEffect(() => {
    if (visible) {
      if (isEditMode && editTask) {
        
        // Helper function to combine date and time properly
        const combineDateAndTime = (dateStr: string, timeStr: string) => {
          const date = new Date(dateStr);
          if (timeStr) {
            const [hours, minutes] = timeStr.split(':');
            date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
          }
          return date;
        };
        
        // Populate fields with existing task data
        setTaskName(editTask.task_name || "");
        setTaskType(editTask.is_event ? "event" : "task");
        setDescription(editTask.task_description || "");
        
        // Properly combine date and time for start and end dates
        const startDateTime = editTask.task_start_date 
          ? combineDateAndTime(editTask.task_start_date, editTask.task_start_time || "00:00")
          : initializeDate();
        const endDateTime = editTask.task_end_date
          ? combineDateAndTime(editTask.task_end_date, editTask.task_end_time || "01:00")
          : initializeEndDate();
          
        
        setStartDate(startDateTime);
        setEndDate(endDateTime);
        setReminderEnabled(editTask.task_reminder || false);
        setLocation(editTask.task_location || "");
        setAttendees(editTask.task_attendees?.join(", ") || "");
        setPriority(editTask.task_priority ?? 2); // Default to Medium if undefined
        setEnergyLevel(editTask.task_energy_level || 50);
        
        // Set selected list and goal
        const taskList = lists.find(list => Number(list.list_id) === editTask.task_list_id);
        const taskGoal = goals.find(goal => goal.goal_id === editTask.task_goal_id);
        setSelectedList(taskList || null);
        setSelectedGoal(taskGoal || null);
      } else {
        // Reset all fields for new task
        setTaskName("");
        setTaskType("task");
        setDescription("");
        setReminderEnabled(false);
        setShowAdvancedOptions(false);
        setLocation("");
        setAttendees("");
        setPriority(2); // Default to Medium
        setEnergyLevel(50);
        setError(null);
        setIsSaving(false);
        setTempDate(null);

        // Reset dates
        setStartDate(initializeDate());
        setEndDate(initializeEndDate());

        // Reset list and goal selection
        setSelectedList(initialSelectedList || null);
        setSelectedGoal(initialSelectedGoal || null);
      }

      // Animate in
      animateIn();
    }
  }, [visible, selectedDate, editTask, isEditMode, lists, goals]);

  // Animation functions
  const animateIn = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateOut = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (callback) callback();
    });
  };

  // Pan responder for swipe down to close
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          animateOut(onClose);
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            tension: 50,
            friction: 10,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Formatting functions
  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  const formatTime = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };
    return date.toLocaleTimeString("en-US", options);
  };

  // checks if two dates are the same day
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // Event handlers for pickers
  const openPicker = (
    field: "startDate" | "startTime" | "endDate" | "endTime",
    mode: "date" | "time"
  ) => {
    setActiveField(field);
    setDatePickerMode(mode);

    // Initialize tempDate with the current active date
    if (field.startsWith("start")) {
      setTempDate(new Date(startDate));
    } else {
      setTempDate(new Date(endDate));
    }

    setShowDatePicker(true);
  };

  // Handle picker change - only stores to tempDate
  const handlePickerChange = (event: any, selectedDateTime?: Date) => {
    if (Platform.OS === "android" && event.type === "dismissed") {
      setShowDatePicker(false);
      setTempDate(null);
      return;
    }

    if (event.type === "set" && Platform.OS === "android") {
      // For Android, validate time selection
      if (
        activeField === "endTime" &&
        isSameDay(startDate, endDate) &&
        selectedDateTime
      ) {
        // If end time is earlier than start time on the same day
        if (selectedDateTime.getTime() <= startDate.getTime()) {
          // Set to start time + 1 hour
          const validTime = new Date(startDate.getTime());
          validTime.setHours(validTime.getHours() + 1);
          applyDateTimeChange(validTime);
        } else {
          applyDateTimeChange(selectedDateTime);
        }
      } else {
        applyDateTimeChange(selectedDateTime);
      }
      setShowDatePicker(false);
      return;
    }

    if (selectedDateTime) {
      setTempDate(selectedDateTime);
    }
  };

  // Apply the date changes when user confirms by pressing Done
  const applyDateTimeChange = (selectedDateTime?: Date) => {
    if (!selectedDateTime && !tempDate) return;

    const dateToApply = selectedDateTime || tempDate;
    if (!dateToApply) return;

    if (activeField === "startDate" || activeField === "startTime") {
      const newDate = new Date(startDate.getTime());

      if (datePickerMode === "date") {
        newDate.setFullYear(dateToApply.getFullYear());
        newDate.setMonth(dateToApply.getMonth());
        newDate.setDate(dateToApply.getDate());

        // Update end date to keep the same date if it is earlier than the new start date
        if (endDate < newDate) {
          const updatedEndDate = new Date(endDate.getTime());
          updatedEndDate.setFullYear(newDate.getFullYear());
          updatedEndDate.setMonth(newDate.getMonth());
          updatedEndDate.setDate(newDate.getDate());
          setEndDate(updatedEndDate);
        }
      } else {
        newDate.setHours(dateToApply.getHours());
        newDate.setMinutes(dateToApply.getMinutes());

        // Update end time to be at least one hour after the start time
        const updatedEndDate = new Date(endDate.getTime());
        // If end time is now less than start time, set it to start time
        if (updatedEndDate.getTime() < newDate.getTime()) {
          const newEndDate = new Date(newDate.getTime());
          newEndDate.setHours(newDate.getHours() + 1);
          setEndDate(newEndDate);
        }
      }

      setStartDate(newDate);
    } else {
      // For end date/time
      const newDate = new Date(endDate.getTime());

      if (datePickerMode === "date") {
        newDate.setFullYear(dateToApply.getFullYear());
        newDate.setMonth(dateToApply.getMonth());
        newDate.setDate(dateToApply.getDate());

        // Ensure end date is not before start date
        const startDateTime = new Date(startDate);
        const newEndDate = new Date(newDate);

        // If we're just comparing dates (not times), set time to 0
        if (datePickerMode === "date") {
          startDateTime.setHours(0, 0, 0, 0);
          newEndDate.setHours(0, 0, 0, 0);
        }

        if (newEndDate < startDateTime) {
          // If end date is earlier than start date, set it to start date
          newDate.setFullYear(startDate.getFullYear());
          newDate.setMonth(startDate.getMonth());
          newDate.setDate(startDate.getDate());
        }
      } else {
        newDate.setHours(dateToApply.getHours());
        newDate.setMinutes(dateToApply.getMinutes());

        // Ensure end time is not before start time if dates are the same
        const sameDay = isSameDay(startDate, newDate);

        if (sameDay && newDate.getTime() <= startDate.getTime()) {
          // If end time is now before or equal to start time on the same day,
          const adjustedDate = new Date(startDate.getTime());
          adjustedDate.setHours(startDate.getHours() + 1);
          setEndDate(adjustedDate);
          return;
        }
      }

      setEndDate(newDate);
    }

    // Clear temporary date
    setTempDate(null);
  };

  // Handle confirming date selection
  const handlePickerDone = () => {
    applyDateTimeChange();
    setShowDatePicker(false);
  };

  // Handle canceling date selection
  const handlePickerCancel = () => {
    setTempDate(null);
    setShowDatePicker(false);
  };

  // Create a new list
  const handleCreateNewList = async (newListData: BaseList) => {
    if (!newListData) throw new Error("List data is required");

    try {
      // Use the addList function from API context
      const response = await addList(newListData);

      // Get the created list data
      const newList = response.data;
      console.log("New list created:", newList);
      // Update the selected list
      setSelectedList(newList);

      return newList;
    } catch (error) {
      console.error("Failed to create new list:", error);
      throw error;
    }
  };

  // Handle save
  const handleSave = async () => {
    if (taskName.trim() === "") {
      setError("Task name is required");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const formatTimeString = (date: Date) => {
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        return `${hours}:${minutes}`;
      };

      if (isEditMode && editTask) {
        // Update existing task
        const updateData: UpdateTaskInput = {
          task_id: editTask.task_id,
          task_name: taskName.trim(),
          task_description: description.trim(),
          task_start_date: startDate.toISOString().split("T")[0],
          task_start_time: formatTimeString(startDate),
          task_end_date: endDate.toISOString().split("T")[0],
          task_end_time: formatTimeString(endDate),
          task_reminder: reminderEnabled,
          task_location: location.trim(),
          task_attendees:
            attendees.trim() === ""
              ? []
              : attendees.split(",").map((a) => a.trim()),
          task_priority: priority,
          task_energy_level: energyLevel,
          task_list_id: selectedList?.list_id ? Number(selectedList.list_id) : undefined,
          task_goal_id: selectedGoal?.goal_id || undefined,
          is_event: taskType === "event",
        };

        // Use the provided onUpdate function or fall back to the context's updateTask
        if (onUpdate) {
          await onUpdate(updateData);
        } else {
          await contextUpdateTask(updateData);
        }
      } else {
        // Create new task
        const taskData: BaseTask = {
          task_name: taskName.trim(),
          task_description: description.trim(),
          task_start_date: startDate.toISOString().split("T")[0],
          task_start_time: formatTimeString(startDate),
          task_end_date: endDate.toISOString().split("T")[0],
          task_end_time: formatTimeString(endDate),
          task_reminder: reminderEnabled,
          task_location: location.trim(),
          task_attendees:
            attendees.trim() === ""
              ? []
              : attendees.split(",").map((a) => a.trim()),
          task_priority: priority,
          task_energy_level: energyLevel,
          task_list_id: selectedList?.list_id ? Number(selectedList.list_id) : undefined,
          task_goal_id: selectedGoal?.goal_id || undefined,
          is_event: taskType === "event",
        };

        // Use the provided onSave function or fall back to the context's addTask
        if (onSave) {
          await onSave(taskData);
        } else {
          await contextAddTask(taskData);
        }
      }

      setIsSaving(false);
      
      // Close the modal on success using requestAnimationFrame to avoid scheduling updates during render
      requestAnimationFrame(() => {
        animateOut(onClose);
      });
    } catch (error: any) {
      console.error(
        "Error creating task:",
        error?.response?.data || error.message
      );
      setError(error?.response?.data?.message || error.message || "Failed to create task");
      setIsSaving(false);
    }
  };

  // Memoized handlers to prevent unnecessary re-renders
  const handleTaskNameChange = useCallback((text: string) => {
    setTaskName(text);
  }, []);

  const handleDescriptionChange = useCallback((text: string) => {
    setDescription(text);
  }, []);

  const handleLocationChange = useCallback((text: string) => {
    setLocation(text);
  }, []);

  const handleAttendeesChange = useCallback((text: string) => {
    setAttendees(text);
  }, []);

  const handleTaskTypeChange = useCallback((type: "event" | "task") => {
    setTaskType(type);
  }, []);

  const handlePriorityChange = useCallback((priority: number) => {
    setPriority(priority);
  }, []);

  const handleReminderToggle = useCallback((value: boolean) => {
    setReminderEnabled(value);
  }, []);

  const handleShowListModal = useCallback(() => {
    setShowListModal(true);
  }, []);

  const handleShowGoalModal = useCallback(() => {
    setShowGoalModal(true);
  }, []);

  const handleToggleAdvanced = useCallback(() => {
    setShowAdvancedOptions(!showAdvancedOptions);
  }, [showAdvancedOptions]);

  const handleClose = useCallback(() => {
    animateOut(onClose);
  }, [onClose]);

  // Render nothing if not visible
  if (!visible) return null;

  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={() => animateOut(onClose)}
    >
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidContainer}
        >
          <Animated.View
            style={[styles.bottomSheet, { transform: [{ translateY }] }]}
            {...panResponder.panHandlers}
          >
            {/* Handle bar for drag down */}
            <View style={styles.dragIndicator} />

            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{isEditMode ? "Edit Task" : "New Task"}</Text>
              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving || taskName.trim() === ""}
              >
                {isSaving ? (
                  <Text style={styles.savingButton}>{isEditMode ? "Updating..." : "Saving..."}</Text>
                ) : (
                  <Text
                    style={[
                      styles.saveButton,
                      taskName.trim() === "" && styles.disabledButton,
                    ]}
                  >
                    {isEditMode ? "Update" : "Save"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Error message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Form fields */}
            <ScrollView style={styles.content}>
              {/* Title input */}
              <TextInput
                style={styles.titleInput}
                placeholder="Add title"
                placeholderTextColor="#888"
                value={taskName}
                onChangeText={handleTaskNameChange}
              />

              {/* Task type selection */}
              <View style={styles.taskTypeContainer}>
                {["task", "event"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.taskTypeButton,
                      taskType === type && styles.taskTypeButtonSelected,
                    ]}
                    onPress={() => handleTaskTypeChange(type as "event" | "task")}
                  >
                    <Text
                      style={[
                        styles.taskTypeText,
                        taskType === type && styles.taskTypeTextSelected,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Separator */}
              <View style={styles.separator} />

              {/* Description field */}
              <View style={styles.optionRow}>
                <Ionicons
                  name="document-text-outline"
                  size={22}
                  color="#5D87FF"
                />
                <TextInput
                  style={styles.descriptionInput}
                  placeholder="Add description"
                  placeholderTextColor="#888"
                  value={description}
                  onChangeText={handleDescriptionChange}
                  multiline
                />
              </View>

              {/* List Selection */}
              <TouchableOpacity
                style={styles.optionRow}
                onPress={handleShowListModal}
              >
                <Ionicons name="list" size={22} color="#5D87FF" />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>List</Text>
                  {selectedList ? (
                    <View style={styles.selectedListContainer}>
                      <View style={styles.listIconContainer}>
                        <Text style={styles.emojiIcon}>
                          {selectedList.list_icon}
                        </Text>
                      </View>
                      <Text style={styles.optionValue}>
                        {selectedList.list_name}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.optionValue}>Select a list (optional)</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
              </TouchableOpacity>

              {/* Goal Selection */}
              <TouchableOpacity
                style={styles.optionRow}
                onPress={handleShowGoalModal}
              >
                <Ionicons name="flag" size={22} color="#5D87FF" />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>Goal</Text>
                  {selectedGoal ? (
                    <View style={styles.selectedGoalContainer}>
                      <View style={[styles.goalIconContainer, { backgroundColor: selectedGoal.goal_color }]}>
                        <Ionicons name={selectedGoal.goal_icon as any} size={16} color="#fff" />
                      </View>
                      <Text style={styles.optionValue}>
                        {selectedGoal.goal_name}
                      </Text>
                      <Text style={styles.goalPeriodBadge}>
                        {selectedGoal.goal_type}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.optionValue}>Select a goal (optional)</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
              </TouchableOpacity>

              {/* Start Date Selection */}
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => openPicker("startDate", "date")}
              >
                <Ionicons name="calendar-outline" size={22} color="#5D87FF" />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>Start Date</Text>
                  <Text style={styles.optionValue}>
                    {formatDate(startDate)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
              </TouchableOpacity>

              {/* Start Time Selection */}
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => openPicker("startTime", "time")}
              >
                <Ionicons name="time-outline" size={22} color="#5D87FF" />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>Start Time</Text>
                  <Text style={styles.optionValue}>
                    {formatTime(startDate)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
              </TouchableOpacity>

              {/* End Date Selection */}
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => openPicker("endDate", "date")}
              >
                <Ionicons name="calendar" size={22} color="#5D87FF" />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>End Date</Text>
                  <Text style={styles.optionValue}>{formatDate(endDate)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
              </TouchableOpacity>

              {/* End Time Selection */}
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => openPicker("endTime", "time")}
              >
                <Ionicons name="time" size={22} color="#5D87FF" />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>End Time</Text>
                  <Text style={styles.optionValue}>{formatTime(endDate)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
              </TouchableOpacity>

              {/* Reminder Toggle */}
              <View style={styles.optionRow}>
                <Ionicons
                  name={
                    reminderEnabled ? "notifications" : "notifications-outline"
                  }
                  size={22}
                  color="#5D87FF"
                />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>Reminder</Text>
                  <Text style={styles.optionValue}>
                    {reminderEnabled ? "On" : "Off"}
                  </Text>
                </View>
                <Switch
                  trackColor={{ false: "#d9d9d9", true: "#a3c0ff" }}
                  thumbColor={reminderEnabled ? "#5D87FF" : "#f4f3f4"}
                  ios_backgroundColor="#d9d9d9"
                  onValueChange={() =>
                    handleReminderToggle(!reminderEnabled)
                  }
                  value={reminderEnabled}
                />
              </View>

              {/* Advanced Options Toggle */}
              <TouchableOpacity
                style={[styles.optionRow, styles.advancedOptionsToggle]}
                onPress={handleToggleAdvanced}
              >
                <Ionicons
                  name={showAdvancedOptions ? "chevron-up" : "chevron-down"}
                  size={22}
                  color="#5D87FF"
                />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.advancedToggleText}>
                    {showAdvancedOptions
                      ? "Hide Advanced Options"
                      : "Show Advanced Options"}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Advanced options */}
              {showAdvancedOptions && (
                <>
                  {/* Location */}
                  <View style={styles.optionRow}>
                    <Ionicons
                      name="location-outline"
                      size={22}
                      color="#5D87FF"
                    />
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionLabel}>Location</Text>
                      <TextInput
                        style={styles.inlineInput}
                        placeholder="Add location (optional)"
                        value={location}
                        onChangeText={handleLocationChange}
                      />
                    </View>
                  </View>

                  {/* Attendees */}
                  <View style={styles.optionRow}>
                    <Ionicons name="people-outline" size={22} color="#5D87FF" />
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionLabel}>Attendees</Text>
                      <TextInput
                        style={styles.inlineInput}
                        placeholder="Add attendees separated by commas (optional)"
                        value={attendees}
                        onChangeText={handleAttendeesChange}
                      />
                    </View>
                  </View>

                  {/* Priority Selection */}
                  <View style={styles.optionRow}>
                    <Ionicons name="flag-outline" size={22} color="#5D87FF" />
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionLabel}>Priority</Text>
                      <View style={styles.priorityContainer}>
                        <TouchableOpacity
                          style={[
                            styles.priorityButton,
                            priority === 1 && styles.priorityButtonSelected,
                            {
                              backgroundColor:
                                priority === 1 ? "#e3f2fd" : "#f5f5f5",
                            },
                          ]}
                          onPress={() => handlePriorityChange(1)}
                        >
                          <Text
                            style={[
                              styles.priorityButtonText,
                              priority === 1 &&
                              styles.priorityButtonTextSelected,
                            ]}
                          >
                            Low
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.priorityButton,
                            priority === 2 && styles.priorityButtonSelected,
                            {
                              backgroundColor:
                                priority === 2 ? "#e3f2fd" : "#f5f5f5",
                            },
                          ]}
                          onPress={() => handlePriorityChange(2)}
                        >
                          <Text
                            style={[
                              styles.priorityButtonText,
                              priority === 2 &&
                              styles.priorityButtonTextSelected,
                            ]}
                          >
                            Medium
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.priorityButton,
                            priority === 3 && styles.priorityButtonSelected,
                            {
                              backgroundColor:
                                priority === 3 ? "#e3f2fd" : "#f5f5f5",
                            },
                          ]}
                          onPress={() => handlePriorityChange(3)}
                        >
                          <Text
                            style={[
                              styles.priorityButtonText,
                              priority === 3 &&
                              styles.priorityButtonTextSelected,
                            ]}
                          >
                            High
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Energy Level */}
                  <View style={styles.optionRow}>
                    <Ionicons
                      name="battery-charging-outline"
                      size={22}
                      color="#5D87FF"
                    />
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionLabel}>Energy Level</Text>
                      <View style={styles.energyLevelContainer}>
                        <View style={styles.energySliderContainer}>
                          <View style={styles.energySliderTrack}>
                            <View
                              style={[
                                styles.energySliderFill,
                                { width: `${energyLevel}%` },
                              ]}
                            />
                          </View>
                          <View style={styles.energySliderMarkers}>
                            {[0, 25, 50, 75, 100].map((marker) => (
                              <TouchableOpacity
                                key={marker}
                                style={styles.energyMarker}
                                onPress={() => setEnergyLevel(marker)}
                              >
                                <View
                                  style={[
                                    styles.energyMarkerDot,
                                    energyLevel >= marker &&
                                    styles.energyMarkerDotActive,
                                  ]}
                                />
                                <Text style={styles.energyMarkerText}>
                                  {marker}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                        <Text style={styles.energyLevelValue}>
                          {energyLevel}
                        </Text>
                      </View>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>

            {/* Date/Time Picker */}
            {showDatePicker && (
              <View>
                {Platform.OS === "ios" ? (
                  <View style={styles.pickerContainer}>
                    <View style={styles.pickerHeader}>
                      <TouchableOpacity onPress={handlePickerCancel}>
                        <Text style={styles.pickerCancelButton}>Cancel</Text>
                      </TouchableOpacity>
                      <Text style={styles.pickerTitle}>
                        {datePickerMode === "date"
                          ? "Select Date"
                          : "Select Time"}
                      </Text>
                      <TouchableOpacity onPress={handlePickerDone}>
                        <Text style={styles.pickerDoneButton}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      testID="picker"
                      value={
                        tempDate ||
                        (activeField.startsWith("start") ? startDate : endDate)
                      }
                      mode={datePickerMode}
                      display="spinner"
                      onChange={handlePickerChange}
                      style={styles.iosPicker}
                      is24Hour={true}
                      minimumDate={
                        activeField === "endDate" ? startDate : undefined
                      }
                    />
                  </View>
                ) : (
                  <DateTimePicker
                    testID="picker"
                    value={
                      tempDate ||
                      (activeField.startsWith("start") ? startDate : endDate)
                    }
                    mode={datePickerMode}
                    display="default"
                    onChange={handlePickerChange}
                    is24Hour={true}
                    minimumDate={
                      activeField === "endDate" ? startDate : undefined
                    }
                  />
                )}
              </View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>

        {/* List Selection Modal */}
        <ListSelectionModal
          visible={showListModal}
          onClose={() => setShowListModal(false)}
          availableLists={lists}
          selectedList={selectedList}
          onSelectList={setSelectedList}
          onCreateNewList={handleCreateNewList}
        />

        {/* Goal Selection Modal */}
        <GoalSelectionModal
          visible={showGoalModal}
          onClose={() => setShowGoalModal(false)}
          availableGoals={goals}
          selectedGoal={selectedGoal}
          onSelectGoal={setSelectedGoal}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    zIndex: 9999,
    elevation: 1000, // For Android
    position: 'absolute',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  keyboardAvoidContainer: {
    width: "100%",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    maxHeight: height * 0.9,
    paddingBottom: Platform.OS === "ios" ? 30 : 0,
  },
  dragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: "#ddd",
    borderRadius: 2.5,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  cancelButton: {
    fontSize: 17,
    color: "#999",
  },
  saveButton: {
    fontSize: 17,
    color: "#5D87FF",
    fontWeight: "600",
  },
  savingButton: {
    fontSize: 17,
    color: "#a3c0ff",
    fontWeight: "600",
  },
  disabledButton: {
    color: "#CCCCCC",
  },
  content: {
    padding: 20,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: "300",
    marginBottom: 20,
    paddingVertical: 5,
  },
  taskTypeContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
  taskTypeButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: "#F2F2F7",
  },
  taskTypeButtonSelected: {
    backgroundColor: "#E1ECFF",
  },
  taskTypeText: {
    fontSize: 15,
    color: "#666",
  },
  taskTypeTextSelected: {
    color: "#5D87FF",
    fontWeight: "500",
  },
  separator: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 15,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  optionTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  optionLabel: {
    fontSize: 16,
    color: "#333",
  },
  optionValue: {
    fontSize: 16,
    color: "#333",
    marginTop: 4,
  },
  descriptionInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 15,
    paddingVertical: 5,
  },
  inlineInput: {
    fontSize: 16,
    color: "#333",
    paddingVertical: 4,
  },
  advancedOptionsToggle: {
    paddingVertical: 12,
  },
  advancedToggleText: {
    fontSize: 16,
    color: "#5D87FF",
    fontWeight: "500",
  },
  pickerContainer: {
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingBottom: Platform.OS === "ios" ? 40 : 0,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  pickerCancelButton: {
    fontSize: 16,
    color: "#999",
  },
  pickerDoneButton: {
    fontSize: 16,
    color: "#5D87FF",
    fontWeight: "600",
  },
  iosPicker: {
    height: 216,
  },
  selectedListContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
listIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8, // spacing between icon and text
  },
  emojiIcon: {
    fontSize: 18,
    textAlign: 'center',
  },
  selectedGoalContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  goalIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  goalPeriodBadge: {
    fontSize: 11,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  errorContainer: {
    backgroundColor: "#fff8f8",
    padding: 10,
    margin: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffdddd",
  },
  errorText: {
    color: "#d32f2f",
    fontSize: 14,
    textAlign: 'center',
  },
  // Priority styles
  priorityContainer: {
    flexDirection: "row",
    marginTop: 8,
  },
  priorityButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginRight: 8,
  },
  priorityButtonSelected: {
    borderWidth: 1,
    borderColor: "#5D87FF",
  },
  priorityButtonText: {
    fontSize: 14,
    color: "#666",
  },
  priorityButtonTextSelected: {
    color: "#5D87FF",
    fontWeight: "500",
  },
  // Energy level styles
  energyLevelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  energySliderContainer: {
    flex: 1,
    marginRight: 16,
  },
  energySliderTrack: {
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    position: "relative",
  },
  energySliderFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#5D87FF",
    borderRadius: 3,
  },
  energySliderMarkers: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  energyMarker: {
    alignItems: "center",
    width: 30,
  },
  energyMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#e0e0e0",
    marginBottom: 4,
  },
  energyMarkerDotActive: {
    backgroundColor: "#5D87FF",
  },
  energyMarkerText: {
    fontSize: 10,
    color: "#999",
  },
  energyLevelValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#5D87FF",
    width: 30,
    textAlign: "right",
  },
});

export default React.memo(AddTaskBottomSheet);