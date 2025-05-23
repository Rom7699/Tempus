
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  TextInput,
  Platform,
  Switch,
  FlatList,
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
//import DateTimePickerModal from 'react-native-modal-datetime-picker';
import axios from "axios";
import { AuthService } from "../services/AuthService";


interface List {
  id: string;
  name: string;
  color: string;
}

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (task: any) => void;
  availableLists?: List[];
  onCreateNewList?: (listName: string) => Promise<List>;
  selectedDate?: Date; // Added selectedDate prop
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({
  visible,
  onClose,
  //onSave,
  availableLists = [],
  onCreateNewList = async () => ({ id: '1', name: 'Default', color: '#5D87FF' }),
  selectedDate, // Receive the selectedDate prop
}) => {
  // Initialize with selectedDate but keep current time
  const initializeDate = () => {
    const now = new Date(); // Current date and time

    if (selectedDate) {
      // Create a date from selectedDate
      const baseDate = new Date(selectedDate);
      // Set the time components from current time
      baseDate.setHours(now.getHours());
      baseDate.setMinutes(now.getMinutes());
      baseDate.setSeconds(now.getSeconds());
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

  // Temporary date states to hold changes until "Done" is pressed
  const [tempDate, setTempDate] = useState<Date | null>(null);

  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(initializeDate);
  const [endDate, setEndDate] = useState<Date>(initializeEndDate);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [selectedList, setSelectedList] = useState<List | null>(null);
  const [showListSelector, setShowListSelector] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showNewListInput, setShowNewListInput] = useState(false);

  // Advanced options
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [location, setLocation] = useState('');
  const [attendees, setAttendees] = useState('');
  const [priority, setPriority] = useState(2);
  const [energyLevel, setEnergyLevel] = useState(50);

  // UI state for pickers
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [activeField, setActiveField] = useState<'startDate' | 'startTime' | 'endDate' | 'endTime'>('startDate');


  // Reset state when modal becomes visible or selectedDate changes
  useEffect(() => {
    if (visible) {
      // Reset the dates when the modal is shown
      setStartDate(initializeDate());
      setEndDate(initializeEndDate());
      setTaskName('');
      setDescription('');
      setReminderEnabled(false);
      setShowAdvancedOptions(false);
      setLocation('');
      setAttendees('');
      setPriority(2);
      setEnergyLevel(50);
      setTempDate(null);

      // Only set selectedList if availableLists has items and selectedList is null
      if (availableLists.length > 0 && !selectedList) {
        setSelectedList(availableLists[0]);
      }
    }
  }, [visible, selectedDate]); // Added selectedDate to dependencies

  // Set initial selected list when availableLists changes and we don't have one selected
  useEffect(() => {
    if (availableLists.length > 0 && !selectedList) {
      setSelectedList(availableLists[0]);
    }
  }, [availableLists.length]); // Only depend on the length


  // Formatting functions
  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatTime = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
    return date.toLocaleTimeString('en-US', options);
  };

  // Event handlers for pickers
  const openPicker = (field: 'startDate' | 'startTime' | 'endDate' | 'endTime', mode: 'date' | 'time') => {
    setActiveField(field);
    setPickerMode(mode);

    // Initialize tempDate with the current active date
    if (field.startsWith('start')) {
      setTempDate(new Date(startDate));
    } else {
      setTempDate(new Date(endDate));
    }

    setShowPicker(true);
  };

  // Handle picker change - only stores to tempDate
  const handlePickerChange = (event: any, selectedDateTime?: Date) => {
    if (Platform.OS === 'android' && event.type === 'dismissed') {
      setShowPicker(false);
      setTempDate(null);
      return;
    }

    if (event.type === 'set' && Platform.OS === 'android') {
      // For Android, validate time selection
      if (activeField === 'endTime' && isSameDay(startDate, endDate) && selectedDateTime) {
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
      setShowPicker(false);
      return;
    }

    if (selectedDateTime) {
      setTempDate(selectedDateTime);
    }
  };
  // checks if two dates are the same day
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // Apply the date changes when user confirms by pressing Done
  const applyDateTimeChange = (selectedDateTime?: Date) => {
    if (!selectedDateTime && !tempDate) return;

    const dateToApply = selectedDateTime || tempDate;
    if (!dateToApply) return;

    if (activeField === 'startDate' || activeField === 'startTime') {
      const newDate = new Date(startDate.getTime());

      if (pickerMode === 'date') {
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
          setEndDate(newEndDate);
        }
      }

      setStartDate(newDate);
    } else {
      // For end date/time
      const newDate = new Date(endDate.getTime());

      if (pickerMode === 'date') {
        newDate.setFullYear(dateToApply.getFullYear());
        newDate.setMonth(dateToApply.getMonth());
        newDate.setDate(dateToApply.getDate());

        // Ensure end date is not before start date
        const startDateTime = new Date(startDate);
        const newEndDate = new Date(newDate);

        // If we're just comparing dates (not times), set time to 0
        if (pickerMode === 'date') {
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
          adjustedDate.setHours(startDate.getHours());
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
    setShowPicker(false);
  };

  // Handle canceling date selection
  const handlePickerCancel = () => {
    setTempDate(null);
    setShowPicker(false);
  };

  // Handle creating new list
  const handleCreateNewList = async () => {
    if (newListName.trim() === '') return;

    try {
      const newList = await onCreateNewList(newListName.trim());
      setSelectedList(newList);
      setShowNewListInput(false);
      setNewListName('');
      setShowListSelector(false);
    } catch (error) {
      console.error("Failed to create new list:", error);
      // You might want to show an error message to the user here
    }
  };

  // Handle close.
  const handleClose = () => {
    setShowListSelector(false);
    onClose();
  };

  // Handle save
  const handleSave = async () => {
    if (taskName.trim() === '') return;

    try {
      const token = await AuthService.getJWTToken();
      console.log("JWT Token:", token);

      if (!token) return;

      const formatTime = (date: Date) => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      };

      const taskData = {
        taskName: taskName.trim(),
        taskDescription: description.trim(),
        taskStartDate: startDate.toISOString().split('T')[0],   // "YYYY-MM-DD"
        taskStartTime: formatTime(startDate),                   // "HH:mm"
        taskEndDate: endDate.toISOString().split('T')[0],
        taskEndTime: formatTime(endDate),
        taskReminder: reminderEnabled,
        taskLocation: location.trim(),
        taskAttendees: attendees.trim() === "" ? [] : attendees.split(',').map(a => a.trim()),
        taskPriority: priority,
        taskEnergyLevel: energyLevel,
        taskListId: selectedList || null
      };

      const response = await axios.post(
        "https://0olevx3qah.execute-api.us-east-1.amazonaws.com/task",
        taskData,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        }
      );

      console.log("Task saved:", response.data);
      handleClose(); // Close modal and clear form
    } catch (error: any) {

      console.error("Error creating task:", error?.response?.data || error.message);
    }
  };



  // Render list item
  const renderListItem = ({ item }: { item: List }) => (
    <TouchableOpacity
      style={[
        styles.listItem,
        selectedList?.id === item.id && styles.selectedListItem
      ]}
      onPress={() => {
        setSelectedList(item);
        setShowListSelector(false);
      }}
    >
      <View style={[styles.listColorIndicator, { backgroundColor: item.color }]} />
      <Text style={styles.listItemText}>{item.name}</Text>
      {selectedList?.id === item.id && (
        <Ionicons name="checkmark" size={20} color="#5D87FF" />
      )}
    </TouchableOpacity>
  );

  // Create sections for SectionList
  const getSections = () => {
    // Regular form fields
    const formFields = [
      // Task Name
      {
        key: 'taskName',
        render: () => (
          <View style={styles.optionRow}>
            <Ionicons name="create-outline" size={22} color="#5D87FF" />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionLabel}>Task Name</Text>
              <TextInput
                style={styles.inlineInput}
                placeholder="Enter task name"
                value={taskName}
                onChangeText={setTaskName}
              />
            </View>
          </View>
        )
      },
      // Description
      {
        key: 'description',
        render: () => (
          <View style={styles.optionRow}>
            <Ionicons name="document-text-outline" size={22} color="#5D87FF" />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionLabel}>Description</Text>
              <TextInput
                style={styles.inlineInput}
                placeholder="Add description (optional)"
                value={description}
                onChangeText={setDescription}
                multiline={true}
                numberOfLines={2}
              />
            </View>
          </View>
        )
      },
      // List Selection
      {
        key: 'list',
        render: () => (
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setShowListSelector(!showListSelector)}
          >
            <Ionicons name="list" size={22} color="#5D87FF" />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionLabel}>List</Text>
              {selectedList ? (
                <View style={styles.selectedListContainer}>
                  <View style={[styles.listColorIndicator, { backgroundColor: selectedList.color }]} />
                  <Text style={styles.optionValue}>{selectedList.name}</Text>
                </View>
              ) : (
                <Text style={styles.optionValue}>Select a list</Text>
              )}
            </View>
            <Ionicons
              name={showListSelector ? "chevron-down" : "chevron-forward"}
              size={20}
              color="#CCCCCC"
            />
          </TouchableOpacity>
        )
      },
      // Start Date Selection
      {
        key: 'startDate',
        render: () => (
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => openPicker('startDate', 'date')}
          >
            <Ionicons name="calendar-outline" size={22} color="#5D87FF" />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionLabel}>Start Date</Text>
              <Text style={styles.optionValue}>{formatDate(startDate)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>
        )
      },
      // Start Time Selection
      {
        key: 'startTime',
        render: () => (
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => openPicker('startTime', 'time')}
          >
            <Ionicons name="time-outline" size={22} color="#5D87FF" />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionLabel}>Start Time</Text>
              <Text style={styles.optionValue}>{formatTime(startDate)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>
        )
      },
      // End Date Selection
      {
        key: 'endDate',
        render: () => (
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => openPicker('endDate', 'date')}
          >
            <Ionicons name="calendar" size={22} color="#5D87FF" />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionLabel}>End Date</Text>
              <Text style={styles.optionValue}>{formatDate(endDate)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>
        )
      },
      // End Time Selection
      {
        key: 'endTime',
        render: () => (
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => openPicker('endTime', 'time')}
          >
            <Ionicons name="time" size={22} color="#5D87FF" />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionLabel}>End Time</Text>
              <Text style={styles.optionValue}>{formatTime(endDate)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>
        )
      },
      // Reminder Toggle
      {
        key: 'reminder',
        render: () => (
          <View style={styles.optionRow}>
            <Ionicons
              name={reminderEnabled ? "notifications" : "notifications-outline"}
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
              onValueChange={() => setReminderEnabled(previousState => !previousState)}
              value={reminderEnabled}
            />
          </View>
        )
      },
      // Advanced Options Toggle
      {
        key: 'advancedToggle',
        render: () => (
          <TouchableOpacity
            style={[styles.optionRow, styles.advancedOptionsToggle]}
            onPress={() => setShowAdvancedOptions(!showAdvancedOptions)}
          >
            <Ionicons
              name={showAdvancedOptions ? "chevron-up" : "chevron-down"}
              size={22}
              color="#5D87FF"
            />
            <View style={styles.optionTextContainer}>
              <Text style={styles.advancedToggleText}>
                {showAdvancedOptions ? "Hide Advanced Options" : "Show Advanced Options"}
              </Text>
            </View>
          </TouchableOpacity>
        )
      },
    ];

    // Advanced options
    const advancedFields = showAdvancedOptions ? [
      // Location
      {
        key: 'location',
        render: () => (
          <View style={styles.optionRow}>
            <Ionicons name="location-outline" size={22} color="#5D87FF" />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionLabel}>Location</Text>
              <TextInput
                style={styles.inlineInput}
                placeholder="Add location (optional)"
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </View>
        )
      },
      // Attendees
      {
        key: 'attendees',
        render: () => (
          <View style={styles.optionRow}>
            <Ionicons name="people-outline" size={22} color="#5D87FF" />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionLabel}>Attendees</Text>
              <TextInput
                style={styles.inlineInput}
                placeholder="Add attendees separated by commas (optional)"
                value={attendees}
                onChangeText={setAttendees}
              />
            </View>
          </View>
        )
      },
      // Priority Selection
      {
        key: 'priority',
        render: () => (
          <View style={styles.optionRow}>
            <Ionicons name="flag-outline" size={22} color="#5D87FF" />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionLabel}>Priority</Text>
              <View style={styles.priorityContainer}>
                <TouchableOpacity
                  style={[
                    styles.priorityButton,
                    priority === 1 && styles.priorityButtonSelected,
                    { backgroundColor: priority === 1 ? '#e3f2fd' : '#f5f5f5' }
                  ]}
                  onPress={() => setPriority(1)}
                >
                  <Text style={[
                    styles.priorityButtonText,
                    priority === 1 && styles.priorityButtonTextSelected
                  ]}>
                    Low
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.priorityButton,
                    priority === 2 && styles.priorityButtonSelected,
                    { backgroundColor: priority === 2 ? '#e3f2fd' : '#f5f5f5' }
                  ]}
                  onPress={() => setPriority(2)}
                >
                  <Text style={[
                    styles.priorityButtonText,
                    priority === 2 && styles.priorityButtonTextSelected
                  ]}>
                    Medium
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.priorityButton,
                    priority === 3 && styles.priorityButtonSelected,
                    { backgroundColor: priority === 3 ? '#e3f2fd' : '#f5f5f5' }
                  ]}
                  onPress={() => setPriority(3)}
                >
                  <Text style={[
                    styles.priorityButtonText,
                    priority === 3 && styles.priorityButtonTextSelected
                  ]}>
                    High
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )
      },
      // Energy Level
      {
        key: 'energyLevel',
        render: () => (
          <View style={styles.optionRow}>
            <Ionicons name="battery-charging-outline" size={22} color="#5D87FF" />
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionLabel}>Energy Level</Text>
              <View style={styles.energyLevelContainer}>
                <View style={styles.energySliderContainer}>
                  <View style={styles.energySliderTrack}>
                    <View
                      style={[
                        styles.energySliderFill,
                        { width: `${energyLevel}%` }
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
                        <View style={[
                          styles.energyMarkerDot,
                          energyLevel >= marker && styles.energyMarkerDotActive
                        ]} />
                        <Text style={styles.energyMarkerText}>{marker}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <Text style={styles.energyLevelValue}>{energyLevel}</Text>
              </View>
            </View>
          </View>
        )
      },
    ] : [];

    // List selection section
    const listsSection = showListSelector ? [
      {
        key: 'lists',
        render: () => (
          <View style={styles.listSelectorContainer}>
            <FlatList
              data={availableLists}
              renderItem={renderListItem}
              keyExtractor={(item) => item.id}
              style={styles.listSelector}
              scrollEnabled={true}
              nestedScrollEnabled={true}
              ListFooterComponent={() => (
                // Move Create New List to the bottom of the FlatList as a footer component
                !showNewListInput ? (
                  <TouchableOpacity
                    style={styles.createNewListButton}
                    onPress={() => setShowNewListInput(true)}
                  >
                    <Ionicons name="add-circle-outline" size={22} color="#5D87FF" />
                    <Text style={styles.createNewListText}>Create New List</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.newListInputContainer}>
                    <TextInput
                      style={styles.newListInput}
                      placeholder="Enter list name"
                      value={newListName}
                      onChangeText={setNewListName}
                      autoFocus
                    />
                    <View style={styles.newListButtonsContainer}>
                      <TouchableOpacity
                        style={styles.newListButton}
                        onPress={() => setShowNewListInput(false)}
                      >
                        <Text style={styles.cancelNewListButton}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.newListButton}
                        onPress={handleCreateNewList}
                        disabled={newListName.trim() === ''}
                      >
                        <Text style={[
                          styles.createNewListButton,
                          newListName.trim() === '' && styles.disabledButton
                        ]}>
                          Create
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )
              )}
            />
          </View>
        )
      }
    ] : [];

    // Combine and return all sections
    return [
      { title: 'lists', data: listsSection },
      { title: 'form', data: formFields },
      { title: 'advanced', data: advancedFields },
    ];
  };

  const renderSectionItem = ({ item }: { item: any }) => {
    return item.render();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={() => {
        Keyboard.dismiss();
        setShowListSelector(false);
      }}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Task</Text>
              <TouchableOpacity
                onPress={handleSave}
                disabled={taskName.trim() === ''}
              >
                <Text style={[styles.saveButton, taskName.trim() === '' && styles.disabledButton]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>

            {/* Use SectionList instead of ScrollView + FlatList combination */}
            <SectionList
              sections={getSections()}
              keyExtractor={(item) => item.key}
              renderItem={renderSectionItem}
              renderSectionHeader={() => null}
              stickySectionHeadersEnabled={false}
              style={styles.modalContent}
            />

            {/* Date/Time Picker */}
            {showPicker && (
              <>
                {Platform.OS === 'ios' ? (
                  <View style={styles.pickerContainer}>
                    <View style={styles.pickerHeader}>
                      <TouchableOpacity onPress={handlePickerCancel}>
                        <Text style={styles.pickerCancelButton}>Cancel</Text>
                      </TouchableOpacity>
                      <Text style={styles.pickerTitle}>
                        {pickerMode === 'date' ? 'Select Date' : 'Select Time'}
                      </Text>
                      <TouchableOpacity onPress={handlePickerDone}>
                        <Text style={styles.pickerDoneButton}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      testID="picker"
                      value={tempDate || (activeField.startsWith('start') ? startDate : endDate)}
                      mode={pickerMode}
                      display="spinner"
                      onChange={handlePickerChange}
                      style={styles.iosPicker}
                      is24Hour={true}

                      minimumDate={activeField === 'endDate' ? startDate : undefined}

                    />
                  </View>
                ) : (
                  <DateTimePicker
                    testID="picker"
                    value={tempDate || (activeField.startsWith('start') ? startDate : endDate)}
                    mode={pickerMode}
                    display="default"
                    onChange={handlePickerChange}
                    is24Hour={true}
                    // Add these props for Android too
                    minimumDate={activeField === 'endDate' ? startDate : undefined}
                  />
                )}
              </>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalView: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600'
  },
  cancelButton: {
    fontSize: 16,
    color: '#999'
  },
  saveButton: {
    fontSize: 16,
    color: '#5D87FF',
    fontWeight: '600'
  },
  disabledButton: {
    color: '#CCCCCC'
  },
  modalContent: {
    flex: 1,
    padding: 16
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionTextContainer: {
    flex: 1,
    marginLeft: 16
  },
  optionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2
  },
  optionValue: {
    fontSize: 16,
    color: '#333'
  },
  inlineInput: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 4
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: Platform.OS === 'ios' ? 40 : 0, // Additional padding for iOS
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerCancelButton: {
    fontSize: 16,
    color: '#999',
  },
  pickerDoneButton: {
    fontSize: 16,
    color: '#5D87FF',
    fontWeight: '600',
  },
  iosPicker: {
    height: 216,
    backgroundColor: 'white',
  },
  selectedListContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listSelectorContainer: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 8,
  },
  listSelector: {
    maxHeight: 200,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  selectedListItem: {
    backgroundColor: '#f0f7ff',
  },
  listColorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 12,
  },
  listItemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  createNewListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  createNewListText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#5D87FF',
  },
  newListInputContainer: {
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  newListInput: {
    fontSize: 16,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  newListButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  newListButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelNewListButton: {
    fontSize: 16,
    color: '#999',
  },

  advancedOptionsToggle: {
    paddingVertical: 12,
  },
  advancedToggleText: {
    fontSize: 16,
    color: '#5D87FF',
    fontWeight: '500',
  },
  priorityContainer: {
    flexDirection: 'row',
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
    borderColor: '#5D87FF',
  },
  priorityButtonText: {
    fontSize: 14,
    color: '#666',
  },
  priorityButtonTextSelected: {
    color: '#5D87FF',
    fontWeight: '500',
  },
  energyLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  energySliderContainer: {
    flex: 1,
    marginRight: 16,
  },
  energySliderTrack: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    position: 'relative',
  },
  energySliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#5D87FF',
    borderRadius: 3,
  },
  energySliderMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  energyMarker: {
    alignItems: 'center',
    width: 30,
  },
  energyMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
    marginBottom: 4,
  },
  energyMarkerDotActive: {
    backgroundColor: '#5D87FF',
  },
  energyMarkerText: {
    fontSize: 10,
    color: '#999',
  },
  energyLevelValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#5D87FF',
    width: 30,
    textAlign: 'right',
  }
});

export default AddTaskModal;
