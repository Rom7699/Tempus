import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BaseGoal } from '@/types/goals';

const { height, width } = Dimensions.get('window');

interface AddGoalModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (goalData: BaseGoal) => Promise<void>;
}

const AddGoalModal: React.FC<AddGoalModalProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  // Animation values
  const translateY = useRef(new Animated.Value(height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Form state
  const [goalName, setGoalName] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [goalTarget, setGoalTarget] = useState('1');
  const [goalType, setGoalType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [goalColor, setGoalColor] = useState('#5D87FF');
  const [goalIcon, setGoalIcon] = useState('flag');
  const [goalStartDate, setGoalStartDate] = useState(new Date());
  const [goalEndDate, setGoalEndDate] = useState<Date | null>(null);
  const [hasEndDate, setHasEndDate] = useState(false);

  // UI state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available colors
  const goalColors = [
    '#5D87FF', '#FF6B6B', '#4ECDC4', '#FFD93D', '#6C5CE7',
    '#FF8E8E', '#A29BFE', '#74B9FF', '#00B894', '#FDCB6E'
  ];

  // Available icons
  const goalIcons = [
    'flag', 'trophy', 'star', 'heart', 'fitness',
    'book', 'briefcase', 'home', 'school', 'leaf',
    'flame', 'diamond', 'rocket', 'medal', 'target'
  ];

  React.useEffect(() => {
    if (visible) {
      // Reset form
      setGoalName('');
      setGoalDescription('');
      setGoalTarget('1');
      setGoalType('weekly');
      setGoalColor('#5D87FF');
      setGoalIcon('flag');
      setGoalStartDate(new Date());
      setGoalEndDate(null);
      setHasEndDate(false);
      setError(null);
      setIsSaving(false);

      // Set default end date based on goal type
      const defaultEndDate = new Date();
      if (goalType === 'daily') {
        defaultEndDate.setDate(defaultEndDate.getDate() + 1);
      } else if (goalType === 'weekly') {
        defaultEndDate.setDate(defaultEndDate.getDate() + 7);
      } else {
        defaultEndDate.setMonth(defaultEndDate.getMonth() + 1);
      }
      setGoalEndDate(defaultEndDate);

      animateIn();
    }
  }, [visible]);

  // Update end date when goal type changes
  React.useEffect(() => {
    if (hasEndDate && goalEndDate) {
      const newEndDate = new Date(goalStartDate);
      if (goalType === 'daily') {
        newEndDate.setDate(newEndDate.getDate() + 1);
      } else if (goalType === 'weekly') {
        newEndDate.setDate(newEndDate.getDate() + 7);
      } else {
        newEndDate.setMonth(newEndDate.getMonth() + 1);
      }
      setGoalEndDate(newEndDate);
    }
  }, [goalType, goalStartDate, hasEndDate]);

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

  const handleClose = () => {
    animateOut(onClose);
  };

  const handleSave = async () => {
    // Validation
    if (!goalName.trim()) {
      setError('Goal name is required');
      return;
    }

    const target = parseInt(goalTarget);
    if (isNaN(target) || target < 1) {
      setError('Goal target must be a number greater than 0');
      return;
    }

    if (goalEndDate && goalEndDate <= goalStartDate) {
      setError('End date must be after start date');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const goalData: BaseGoal = {
        goal_name: goalName.trim(),
        goal_description: goalDescription.trim(),
        goal_target: target,
        goal_type: goalType,
        goal_color: goalColor,
        goal_icon: goalIcon,
        goal_start_date: goalStartDate.toISOString().split('T')[0],
        goal_end_date: hasEndDate && goalEndDate ? goalEndDate.toISOString().split('T')[0] : undefined,
      };

      await onSave(goalData);
      animateOut(onClose);
    } catch (error: any) {
      setError(error.message || 'Failed to create goal');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date, isEndDate = false) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
      setShowEndDatePicker(false);
    }

    if (selectedDate) {
      if (isEndDate) {
        setGoalEndDate(selectedDate);
      } else {
        setGoalStartDate(selectedDate);
      }
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.modal, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>New Goal</Text>
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              <Text style={[styles.saveButton, isSaving && styles.disabledButton]}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Goal Name */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Goal Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter goal name"
                placeholderTextColor="#999"
                value={goalName}
                onChangeText={setGoalName}
              />
            </View>

            {/* Goal Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your goal (optional)"
                placeholderTextColor="#999"
                value={goalDescription}
                onChangeText={setGoalDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Goal Target */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Target</Text>
              <TextInput
                style={styles.input}
                placeholder="Number of tasks to complete"
                placeholderTextColor="#999"
                value={goalTarget}
                onChangeText={setGoalTarget}
                keyboardType="numeric"
              />
            </View>

            {/* Goal Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Goal Type</Text>
              <View style={styles.optionRow}>
                {(['daily', 'weekly', 'monthly'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      goalType === type && styles.typeButtonActive
                    ]}
                    onPress={() => setGoalType(type)}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      goalType === type && styles.typeButtonTextActive
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Goal Color */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Color</Text>
              <View style={styles.colorGrid}>
                {goalColors.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorButton,
                      { backgroundColor: color },
                      goalColor === color && styles.colorButtonSelected
                    ]}
                    onPress={() => setGoalColor(color)}
                  >
                    {goalColor === color && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Goal Icon */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.iconRow}>
                  {goalIcons.map(icon => (
                    <TouchableOpacity
                      key={icon}
                      style={[
                        styles.iconButton,
                        { backgroundColor: goalColor },
                        goalIcon === icon && styles.iconButtonSelected
                      ]}
                      onPress={() => setGoalIcon(icon)}
                    >
                      <Ionicons name={icon as any} size={20} color="#fff" />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Start Date */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Start Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#5D87FF" />
                <Text style={styles.dateButtonText}>{formatDate(goalStartDate)}</Text>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </TouchableOpacity>
            </View>

            {/* End Date Toggle */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setHasEndDate(!hasEndDate)}
              >
                <Text style={styles.sectionTitle}>Set End Date</Text>
                <View style={[
                  styles.toggle,
                  hasEndDate && styles.toggleActive
                ]}>
                  <View style={[
                    styles.toggleThumb,
                    hasEndDate && styles.toggleThumbActive
                  ]} />
                </View>
              </TouchableOpacity>
            </View>

            {/* End Date */}
            {hasEndDate && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>End Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Ionicons name="calendar" size={20} color="#5D87FF" />
                  <Text style={styles.dateButtonText}>
                    {goalEndDate ? formatDate(goalEndDate) : 'Select date'}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#ccc" />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Date Pickers */}
          {showStartDatePicker && (
            <DateTimePicker
              value={goalStartDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => handleDateChange(event, date, false)}
              minimumDate={new Date()}
            />
          )}

          {showEndDatePicker && goalEndDate && (
            <DateTimePicker
              value={goalEndDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => handleDateChange(event, date, true)}
              minimumDate={goalStartDate}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: height * 0.9,
    paddingBottom: Platform.OS === 'ios' ? 30 : 0,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#e0e0e0',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
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
    color: '#ccc',
  },
  errorContainer: {
    backgroundColor: '#fff8f8',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffdddd',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#5D87FF',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorButtonSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonSelected: {
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  dateButtonText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#5D87FF',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
});

export default AddGoalModal;