import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  Switch,
  ScrollView,
  Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (task: {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    reminder: boolean;
    category: 'inbox' | 'custom';
  }) => void;
  selectedDate: string;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ 
  visible, 
  onClose, 
  onSave,
  selectedDate
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  
  // Replace single time with start and end times
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(new Date().getTime() + 60*60*1000)); // Default to 1 hour later
  
  const [reminder, setReminder] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Replace single time picker state with two states
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  
  // Format the date for display
  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };
  
  // Format the time for display
  const formatTime = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleTimeString('en-US', options);
  };
  
  // Handle date change
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    
    if (selectedDate) {
      setDate(selectedDate);
    }
    
    // On Android, hide the picker after selection
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
  };
  
  // Handle start time change
  const onStartTimeChange = (event: any, selectedTime?: Date) => {
    if (event.type === 'dismissed') {
      setShowStartTimePicker(false);
      return;
    }
    
    if (selectedTime) {
      setStartTime(selectedTime);
      
      // If end time is earlier than start time, update end time
      if (selectedTime > endTime) {
        // Set end time 1 hour after start time
        setEndTime(new Date(selectedTime.getTime() + 60*60*1000));
      }
    }
    
    // On Android, hide the picker after selection
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
    }
    console.log('Start Time:', selectedTime);
  };
  
  // Handle end time change
  const onEndTimeChange = (event: any, selectedTime?: Date) => {
    if (event.type === 'dismissed') {
      setShowEndTimePicker(false);
      return;
    }
    
    if (selectedTime) {
      setEndTime(selectedTime);
    }
    
    // On Android, hide the picker after selection
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false);
    }
  };
  
  // Reset and close modal
  const handleClose = () => {
    setTitle('');
    setDate(new Date());
    setStartTime(new Date());
    setEndTime(new Date(new Date().getTime() + 60*60*1000));
    setReminder(true);
    onClose();
  };
  
  // Save task and close modal
  const handleSave = () => {
    if (title.trim() === '') {
      return; // Don't save empty tasks
    }
    
    // Format date to YYYY-MM-DD for consistency
    const formattedDate = date.toISOString().split('T')[0];
    
    onSave({
      title: title.trim(),
      date: formattedDate,
      startTime: formatTime(startTime),
      endTime: formatTime(endTime),
      reminder,
      category: 'inbox'
    });
    
    handleClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
                disabled={title.trim() === ''}
              >
                <Text style={[
                  styles.saveButton,
                  title.trim() === '' && styles.disabledButton
                ]}>Save</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {/* Task Title Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.titleInput}
                  placeholder="What would you like to do?"
                  value={title}
                  onChangeText={setTitle}
                  autoFocus
                />
              </View>
              
              {/* Date Selection */}
              <TouchableOpacity 
                style={styles.optionRow}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={22} color="#5D87FF" />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>Date</Text>
                  <Text style={styles.optionValue}>{formatDate(date)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
              </TouchableOpacity>
              
              {/* Start Time Selection */}
              <TouchableOpacity 
                style={styles.optionRow}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Ionicons name="time-outline" size={22} color="#5D87FF" />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>Start Time</Text>
                  <Text style={styles.optionValue}>{formatTime(startTime)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
              </TouchableOpacity>
              
              {/* End Time Selection */}
              <TouchableOpacity 
                style={styles.optionRow}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Ionicons name="timer-outline" size={22} color="#5D87FF" />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>End Time</Text>
                  <Text style={styles.optionValue}>{formatTime(endTime)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
              </TouchableOpacity>
              
              {/* Reminder Toggle */}
              <View style={styles.optionRow}>
                <Ionicons name="notifications-outline" size={22} color="#5D87FF" />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>Reminder</Text>
                  <Text style={styles.optionValue}>
                    {reminder ? 'On' : 'Off'}
                  </Text>
                </View>
                <Switch
                  value={reminder}
                  onValueChange={setReminder}
                  trackColor={{ false: '#D1D1D6', true: '#5D87FF' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              
              {/* List Selection */}
              <TouchableOpacity style={styles.optionRow}>
                <Ionicons name="list-outline" size={22} color="#5D87FF" />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>List</Text>
                  <Text style={styles.optionValue}>Inbox</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
              </TouchableOpacity>
            </ScrollView>
            
            {/* Date Picker (conditionally rendered) */}
            {showDatePicker && (
              <>
                {Platform.OS === 'ios' ? (
                  <View style={styles.pickerContainer}>
                    <View style={styles.pickerHeader}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.pickerCancelButton}>Cancel</Text>
                      </TouchableOpacity>
                      <Text style={styles.pickerTitle}>Select Date</Text>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.pickerDoneButton}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      testID="datePicker"
                      value={date}
                      mode="date"
                      display="spinner"
                      onChange={onDateChange}
                      style={styles.iosPicker}
                    />
                  </View>
                ) : (
                  <DateTimePicker
                    testID="datePicker"
                    value={date}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                  />
                )}
              </>
            )}
            
            {/* Start Time Picker */}
            {showStartTimePicker && (
              <>
                {Platform.OS === 'ios' ? (
                  <View style={styles.pickerContainer}>
                    <View style={styles.pickerHeader}>
                      <TouchableOpacity onPress={() => setShowStartTimePicker(false)}>
                        <Text style={styles.pickerCancelButton}>Cancel</Text>
                      </TouchableOpacity>
                      <Text style={styles.pickerTitle}>Select Start Time</Text>
                      <TouchableOpacity onPress={() => setShowStartTimePicker(false)}>
                        <Text style={styles.pickerDoneButton}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      testID="startTimePicker"
                      value={startTime}
                      mode="time"
                      display="spinner"
                      is24Hour={true}
                      onChange={onStartTimeChange}
                      style={styles.iosPicker}
                    />
                  </View>
                ) : (
                  <DateTimePicker
                    testID="startTimePicker"
                    value={startTime}
                    mode="time"
                    is24Hour={true}
                    display="default"
                    onChange={onStartTimeChange}
                  />
                )}
              </>
            )}
            
            {/* End Time Picker */}
            {showEndTimePicker && (
              <>
                {Platform.OS === 'ios' ? (
                  <View style={styles.pickerContainer}>
                    <View style={styles.pickerHeader}>
                      <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                        <Text style={styles.pickerCancelButton}>Cancel</Text>
                      </TouchableOpacity>
                      <Text style={styles.pickerTitle}>Select End Time</Text>
                      <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                        <Text style={styles.pickerDoneButton}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      testID="endTimePicker"
                      value={endTime}
                      is24Hour={true}
                      mode="time"
                      display="spinner"
                      onChange={onEndTimeChange}
                      style={styles.iosPicker}
                    />
                  </View>
                ) : (
                  <DateTimePicker
                    testID="endTimePicker"
                    value={endTime}
                    is24Hour={true}
                    mode="time"
                    display="default"
                    onChange={onEndTimeChange}
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

// Styles remain mostly the same

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
    shadowOffset: {
      width: 0,
      height: -2
    },
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
    fontWeight: '600',
  },
  cancelButton: {
    fontSize: 16,
    color: '#999',
  },
  saveButton: {
    fontSize: 16,
    color: '#5D87FF',
    fontWeight: '600',
  },
  disabledButton: {
    color: '#CCCCCC',
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
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
    fontSize: 17,
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
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 20,
    paddingBottom: 20,
  },
  titleInput: {
    fontSize: 16,
    paddingVertical: 8,
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
    marginLeft: 16,
  },
  optionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  optionValue: {
    fontSize: 16,
    color: '#333',
  },
  optionText: {
    fontSize: 16,
    flex: 1,
    marginLeft: 16,
  },
});

export default AddTaskModal;