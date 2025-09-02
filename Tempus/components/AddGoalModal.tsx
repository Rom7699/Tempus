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
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BaseGoal } from '@/types/goals';
import { createGradient } from '../utils/colorUtils';

const { height, width } = Dimensions.get('window');

interface AddGoalModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (goalData: BaseGoal) => Promise<void>;
  goalType?: 'daily' | 'weekly' | 'monthly'; // Optional, can be selected in modal
  initialData?: any; // For editing existing goals
}

const AddGoalModal: React.FC<AddGoalModalProps> = ({
  visible,
  onClose,
  onSave,
  goalType,
  initialData,
}) => {
  // Animation values
  const translateY = useRef(new Animated.Value(height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Form state
  const [selectedGoalType, setSelectedGoalType] = useState<'daily' | 'weekly' | 'monthly'>(goalType || 'daily');
  const [goalName, setGoalName] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [goalTarget, setGoalTarget] = useState('1');
  const [goalColor, setGoalColor] = useState('#5D87FF');
  const [goalIcon, setGoalIcon] = useState('flag');
  const [goalStartDate, setGoalStartDate] = useState(new Date());
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Default: weekdays
  const [goalTargetDays, setGoalTargetDays] = useState<number | 'forever' | 'custom'>('forever');
  const [customTargetDays, setCustomTargetDays] = useState('');
  const [isCycling, setIsCycling] = useState(false);
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
    'flame', 'diamond', 'rocket', 'medal', 'radio-button-on'
  ];


  React.useEffect(() => {
    if (visible) {
      console.log('AddGoalModal opening with goalType:', goalType);
      
      // Initialize form - either with existing data or defaults
      if (initialData) {
        // Editing existing goal
        setSelectedGoalType(initialData.goal_type || goalType || 'daily');
        setGoalName(initialData.goal_name || '');
        setGoalDescription(initialData.goal_description || '');
        setGoalTarget(initialData.goal_target?.toString() || '1');
        setGoalColor(initialData.goal_color || '#5D87FF');
        setGoalIcon(initialData.goal_icon || 'flag');
        setGoalStartDate(new Date(initialData.goal_start_date || new Date()));
        setSelectedDays(initialData.goal_selected_days || (initialData.goal_type === 'daily' ? [1, 2, 3, 4, 5] : []));
        
        // Handle cycling
        setIsCycling(initialData.is_cycling || false);
        
        // Handle goal_cycle_duration (only show if cycling)
        if (initialData.is_cycling) {
          if (initialData.goal_cycle_duration === null) {
            setGoalTargetDays('forever');
            setCustomTargetDays('');
          } else if ([1, 2, 3, 4, 7, 30].includes(initialData.goal_cycle_duration)) {
            setGoalTargetDays(initialData.goal_cycle_duration);
            setCustomTargetDays('');
          } else {
            setGoalTargetDays('custom');
            setCustomTargetDays(initialData.goal_cycle_duration?.toString() || '');
          }
        }
        
        // Handle goal end date
        if (initialData.goal_end_date) {
          setHasEndDate(true);
          setGoalEndDate(new Date(initialData.goal_end_date));
        } else {
          setHasEndDate(false);
          setGoalEndDate(null);
        }
      } else {
        // Creating new goal - reset form
        const newStartDate = new Date();
        setSelectedGoalType(goalType || 'daily');
        setGoalName('');
        setGoalDescription('');
        setGoalTarget('1');
        setGoalColor('#5D87FF');
        setGoalIcon('flag');
        setGoalStartDate(newStartDate);
        setSelectedDays((goalType || 'daily') === 'daily' ? [1, 2, 3, 4, 5] : []);
        setGoalTargetDays('forever');
        setCustomTargetDays('');
        setIsCycling(false);
        setHasEndDate(false);
        setGoalEndDate(null);
      }
      
      setError(null);
      setIsSaving(false);
      animateIn();
    }
  }, [visible, goalType, initialData]);


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

    if (selectedGoalType === 'daily' && selectedDays.length === 0) {
      setError('Please select at least one day for daily goals');
      return;
    }

    if (goalTargetDays === 'custom') {
      const customDays = parseInt(customTargetDays);
      if (isNaN(customDays) || customDays < 1) {
        const unit = selectedGoalType === 'daily' ? 'days' : selectedGoalType === 'weekly' ? 'weeks' : 'months';
        setError(`Please enter a valid number of ${unit} for custom duration`);
        return;
      }
    }

    setError(null);
    setIsSaving(true);

    try {
      // Calculate goal end date based on cycling and user selection
      let calculatedEndDate: string | undefined = undefined;
      
      if (hasEndDate && goalEndDate) {
        // User explicitly set an end date
        calculatedEndDate = goalEndDate.toISOString().split('T')[0];
      } else if (isCycling) {
        // Cycling goal without explicit end date = one cycle duration from start
        const cycleDuration = goalTargetDays === 'custom' ? parseInt(customTargetDays) : (goalTargetDays === 'forever' ? 1 : goalTargetDays);
        const endDate = new Date(goalStartDate);
        
        if (selectedGoalType === 'daily') {
          endDate.setDate(goalStartDate.getDate() + cycleDuration - 1);
        } else if (selectedGoalType === 'weekly') {
          endDate.setDate(goalStartDate.getDate() + (7 * cycleDuration) - 1);
        } else if (selectedGoalType === 'monthly') {
          endDate.setMonth(goalStartDate.getMonth() + cycleDuration);
          endDate.setDate(endDate.getDate() - 1);
        }
        
        calculatedEndDate = endDate.toISOString().split('T')[0];
      }
      // If not cycling and no end date selected = forever (undefined)

      const goalData: BaseGoal = {
        goal_name: goalName.trim(),
        goal_description: goalDescription.trim(),
        goal_target: target,
        goal_type: selectedGoalType,
        goal_color: goalColor,
        goal_icon: goalIcon,
        goal_start_date: goalStartDate.toISOString().split('T')[0],
        goal_cycle_duration: isCycling ? (goalTargetDays === 'custom' ? parseInt(customTargetDays) : (goalTargetDays === 'forever' ? undefined : goalTargetDays)) : undefined,
        goal_selected_days: selectedGoalType === 'daily' ? selectedDays : undefined,
        is_cycling: isCycling,
        goal_end_date: calculatedEndDate,
      };

      await onSave(goalData);
      setIsSaving(false);
      animateOut(onClose);
    } catch (error: any) {
      setError(error.message || 'Failed to create goal');
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

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
      setShowEndDatePicker(false);
      
      if (event.type === 'set' && selectedDate) {
        setGoalStartDate(selectedDate);
      }
    } else {
      // For iOS, we handle the date change immediately but don't close the picker
      if (selectedDate) {
        setGoalStartDate(selectedDate);
      }
    }
  };

  const handleDatePickerDone = () => {
    setShowStartDatePicker(false);
  };

  const handleDatePickerCancel = () => {
    setShowStartDatePicker(false);
    // Reset to previous values if needed
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
      
      if (event.type === 'set' && selectedDate) {
        setGoalEndDate(selectedDate);
      }
    } else {
      // For iOS, we handle the date change immediately but don't close the picker
      if (selectedDate) {
        setGoalEndDate(selectedDate);
      }
    }
  };

  const handleEndDateDone = () => {
    setShowEndDatePicker(false);
  };

  const handleEndDateCancel = () => {
    setShowEndDatePicker(false);
    // Reset to previous values if needed
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
            <Text style={styles.title}>{initialData ? 'Edit Goal' : 'New Goal'}</Text>
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

          <ScrollView 
            style={styles.content} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
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

            {/* Goal Type Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Goal Type</Text>
              <Text style={styles.sectionSubtext}>Choose how often this goal resets</Text>
              
              <View style={styles.goalTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.goalTypeOption,
                    selectedGoalType === 'daily' && styles.goalTypeOptionSelected
                  ]}
                  onPress={() => setSelectedGoalType('daily')}
                >
                  <Ionicons 
                    name={selectedGoalType === 'daily' ? 'radio-button-on' : 'radio-button-off'} 
                    size={20} 
                    color={selectedGoalType === 'daily' ? '#5D87FF' : '#ccc'} 
                  />
                  <View style={styles.goalTypeInfo}>
                    <Text style={[
                      styles.goalTypeText,
                      selectedGoalType === 'daily' && styles.goalTypeTextSelected
                    ]}>Daily Goal</Text>
                    <Text style={styles.goalTypeSubtext}>Track progress every day</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.goalTypeOption,
                    selectedGoalType === 'weekly' && styles.goalTypeOptionSelected
                  ]}
                  onPress={() => setSelectedGoalType('weekly')}
                >
                  <Ionicons 
                    name={selectedGoalType === 'weekly' ? 'radio-button-on' : 'radio-button-off'} 
                    size={20} 
                    color={selectedGoalType === 'weekly' ? '#5D87FF' : '#ccc'} 
                  />
                  <View style={styles.goalTypeInfo}>
                    <Text style={[
                      styles.goalTypeText,
                      selectedGoalType === 'weekly' && styles.goalTypeTextSelected
                    ]}>Weekly Goal</Text>
                    <Text style={styles.goalTypeSubtext}>Track progress every week</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.goalTypeOption,
                    selectedGoalType === 'monthly' && styles.goalTypeOptionSelected
                  ]}
                  onPress={() => setSelectedGoalType('monthly')}
                >
                  <Ionicons 
                    name={selectedGoalType === 'monthly' ? 'radio-button-on' : 'radio-button-off'} 
                    size={20} 
                    color={selectedGoalType === 'monthly' ? '#5D87FF' : '#ccc'} 
                  />
                  <View style={styles.goalTypeInfo}>
                    <Text style={[
                      styles.goalTypeText,
                      selectedGoalType === 'monthly' && styles.goalTypeTextSelected
                    ]}>Monthly Goal</Text>
                    <Text style={styles.goalTypeSubtext}>Track progress every month</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Day Selection for Daily Goals */}
            {selectedGoalType === 'daily' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Days</Text>
                <Text style={styles.sectionSubtext}>Choose which days to include in this daily goal</Text>
                <View style={styles.daySelectionContainer}>
                  {(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const).map((dayName, index) => {
                    const isSelected = selectedDays.includes(index);
                    return (
                      <TouchableOpacity
                        key={dayName}
                        style={[
                          styles.dayButton,
                          isSelected && styles.dayButtonSelected
                        ]}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedDays(selectedDays.filter(day => day !== index));
                          } else {
                            setSelectedDays([...selectedDays, index].sort());
                          }
                        }}
                      >
                        <Text style={[
                          styles.dayButtonText,
                          isSelected && styles.dayButtonTextSelected
                        ]}>
                          {dayName}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark" size={16} color="#fff" style={styles.dayButtonCheck} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {selectedDays.length === 0 && (
                  <Text style={styles.daySelectionError}>Please select at least one day</Text>
                )}
              </View>
            )}

            {/* Goal Color */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Color</Text>
              <View style={styles.colorGrid}>
                {goalColors.map(color => {
                  const gradient = createGradient(color);
                  return (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorButton,
                        goalColor === color && styles.colorButtonSelected
                      ]}
                      onPress={() => setGoalColor(color)}
                    >
                      <LinearGradient
                        colors={gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.colorGradient}
                      >
                        {goalColor === color && (
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Goal Icon */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.iconRow}>
                  {goalIcons.map(icon => {
                    const gradient = createGradient(goalColor);
                    return (
                      <TouchableOpacity
                        key={icon}
                        style={[
                          styles.iconButton,
                          goalIcon === icon && styles.iconButtonSelected
                        ]}
                        onPress={() => setGoalIcon(icon)}
                      >
                        <LinearGradient
                          colors={gradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.iconGradient}
                        >
                          <Ionicons name={icon as any} size={20} color="#fff" />
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Cycling Option */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Goal Options</Text>
              
              <View style={styles.toggleOption}>
                <Ionicons
                  name={isCycling ? 'refresh-circle' : 'refresh-circle-outline'}
                  size={22}
                  color="#5D87FF"
                />
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>Cycle Goal</Text>
                  <Text style={styles.toggleSubtext}>
                    Goal resets automatically after each cycle
                  </Text>
                </View>
                <Switch
                  trackColor={{ false: "#d9d9d9", true: "#a3c0ff" }}
                  thumbColor={isCycling ? "#5D87FF" : "#f4f3f4"}
                  ios_backgroundColor="#d9d9d9"
                  onValueChange={() => setIsCycling(!isCycling)}
                  value={isCycling}
                  style={styles.switch}
                />
              </View>
            </View>

            {/* Cycle Duration - Only show if cycling is enabled */}
            {isCycling && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cycle Duration</Text>
                <Text style={styles.sectionSubtext}>How long should each cycle last?</Text>
              
              <View style={styles.durationOptionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.durationOption,
                    goalTargetDays === 'forever' && styles.durationOptionSelected
                  ]}
                  onPress={() => setGoalTargetDays('forever')}
                >
                  <Ionicons 
                    name={goalTargetDays === 'forever' ? 'radio-button-on' : 'radio-button-off'} 
                    size={20} 
                    color={goalTargetDays === 'forever' ? '#5D87FF' : '#ccc'} 
                  />
                  <Text style={[
                    styles.durationOptionText,
                    goalTargetDays === 'forever' && styles.durationOptionTextSelected
                  ]}>Forever</Text>
                </TouchableOpacity>

                {selectedGoalType === 'daily' && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.durationOption,
                        goalTargetDays === 7 && styles.durationOptionSelected
                      ]}
                      onPress={() => setGoalTargetDays(7)}
                    >
                      <Ionicons 
                        name={goalTargetDays === 7 ? 'radio-button-on' : 'radio-button-off'} 
                        size={20} 
                        color={goalTargetDays === 7 ? '#5D87FF' : '#ccc'} 
                      />
                      <Text style={[
                        styles.durationOptionText,
                        goalTargetDays === 7 && styles.durationOptionTextSelected
                      ]}>1 Week</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.durationOption,
                        goalTargetDays === 30 && styles.durationOptionSelected
                      ]}
                      onPress={() => setGoalTargetDays(30)}
                    >
                      <Ionicons 
                        name={goalTargetDays === 30 ? 'radio-button-on' : 'radio-button-off'} 
                        size={20} 
                        color={goalTargetDays === 30 ? '#5D87FF' : '#ccc'} 
                      />
                      <Text style={[
                        styles.durationOptionText,
                        goalTargetDays === 30 && styles.durationOptionTextSelected
                      ]}>30 Days</Text>
                    </TouchableOpacity>
                  </>
                )}

                {selectedGoalType === 'weekly' && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.durationOption,
                        goalTargetDays === 1 && styles.durationOptionSelected
                      ]}
                      onPress={() => setGoalTargetDays(1)}
                    >
                      <Ionicons 
                        name={goalTargetDays === 1 ? 'radio-button-on' : 'radio-button-off'} 
                        size={20} 
                        color={goalTargetDays === 1 ? '#5D87FF' : '#ccc'} 
                      />
                      <Text style={[
                        styles.durationOptionText,
                        goalTargetDays === 1 && styles.durationOptionTextSelected
                      ]}>1 Week</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.durationOption,
                        goalTargetDays === 2 && styles.durationOptionSelected
                      ]}
                      onPress={() => setGoalTargetDays(2)}
                    >
                      <Ionicons 
                        name={goalTargetDays === 2 ? 'radio-button-on' : 'radio-button-off'} 
                        size={20} 
                        color={goalTargetDays === 2 ? '#5D87FF' : '#ccc'} 
                      />
                      <Text style={[
                        styles.durationOptionText,
                        goalTargetDays === 2 && styles.durationOptionTextSelected
                      ]}>2 Weeks</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.durationOption,
                        goalTargetDays === 3 && styles.durationOptionSelected
                      ]}
                      onPress={() => setGoalTargetDays(3)}
                    >
                      <Ionicons 
                        name={goalTargetDays === 3 ? 'radio-button-on' : 'radio-button-off'} 
                        size={20} 
                        color={goalTargetDays === 3 ? '#5D87FF' : '#ccc'} 
                      />
                      <Text style={[
                        styles.durationOptionText,
                        goalTargetDays === 3 && styles.durationOptionTextSelected
                      ]}>3 Weeks</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.durationOption,
                        goalTargetDays === 4 && styles.durationOptionSelected
                      ]}
                      onPress={() => setGoalTargetDays(4)}
                    >
                      <Ionicons 
                        name={goalTargetDays === 4 ? 'radio-button-on' : 'radio-button-off'} 
                        size={20} 
                        color={goalTargetDays === 4 ? '#5D87FF' : '#ccc'} 
                      />
                      <Text style={[
                        styles.durationOptionText,
                        goalTargetDays === 4 && styles.durationOptionTextSelected
                      ]}>4 Weeks</Text>
                    </TouchableOpacity>
                  </>
                )}

                {selectedGoalType === 'monthly' && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.durationOption,
                        goalTargetDays === 1 && styles.durationOptionSelected
                      ]}
                      onPress={() => setGoalTargetDays(1)}
                    >
                      <Ionicons 
                        name={goalTargetDays === 1 ? 'radio-button-on' : 'radio-button-off'} 
                        size={20} 
                        color={goalTargetDays === 1 ? '#5D87FF' : '#ccc'} 
                      />
                      <Text style={[
                        styles.durationOptionText,
                        goalTargetDays === 1 && styles.durationOptionTextSelected
                      ]}>1 Month</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.durationOption,
                        goalTargetDays === 2 && styles.durationOptionSelected
                      ]}
                      onPress={() => setGoalTargetDays(2)}
                    >
                      <Ionicons 
                        name={goalTargetDays === 2 ? 'radio-button-on' : 'radio-button-off'} 
                        size={20} 
                        color={goalTargetDays === 2 ? '#5D87FF' : '#ccc'} 
                      />
                      <Text style={[
                        styles.durationOptionText,
                        goalTargetDays === 2 && styles.durationOptionTextSelected
                      ]}>2 Months</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.durationOption,
                        goalTargetDays === 3 && styles.durationOptionSelected
                      ]}
                      onPress={() => setGoalTargetDays(3)}
                    >
                      <Ionicons 
                        name={goalTargetDays === 3 ? 'radio-button-on' : 'radio-button-off'} 
                        size={20} 
                        color={goalTargetDays === 3 ? '#5D87FF' : '#ccc'} 
                      />
                      <Text style={[
                        styles.durationOptionText,
                        goalTargetDays === 3 && styles.durationOptionTextSelected
                      ]}>3 Months</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.durationOption,
                        goalTargetDays === 4 && styles.durationOptionSelected
                      ]}
                      onPress={() => setGoalTargetDays(4)}
                    >
                      <Ionicons 
                        name={goalTargetDays === 4 ? 'radio-button-on' : 'radio-button-off'} 
                        size={20} 
                        color={goalTargetDays === 4 ? '#5D87FF' : '#ccc'} 
                      />
                      <Text style={[
                        styles.durationOptionText,
                        goalTargetDays === 4 && styles.durationOptionTextSelected
                      ]}>4 Months</Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={[
                    styles.durationOption,
                    goalTargetDays === 'custom' && styles.durationOptionSelected
                  ]}
                  onPress={() => setGoalTargetDays('custom')}
                >
                  <Ionicons 
                    name={goalTargetDays === 'custom' ? 'radio-button-on' : 'radio-button-off'} 
                    size={20} 
                    color={goalTargetDays === 'custom' ? '#5D87FF' : '#ccc'} 
                  />
                  <Text style={[
                    styles.durationOptionText,
                    goalTargetDays === 'custom' && styles.durationOptionTextSelected
                  ]}>Custom</Text>
                </TouchableOpacity>
              </View>

              {goalTargetDays === 'custom' && (
                <View style={styles.customDurationContainer}>
                  <TextInput
                    style={styles.customDurationInput}
                    placeholder={`Enter number of ${selectedGoalType === 'daily' ? 'days' : selectedGoalType === 'weekly' ? 'weeks' : 'months'}`}
                    placeholderTextColor="#999"
                    value={customTargetDays}
                    onChangeText={setCustomTargetDays}
                    keyboardType="numeric"
                  />
                  <Text style={styles.customDurationLabel}>
                    {selectedGoalType === 'daily' ? 'days' : selectedGoalType === 'weekly' ? 'weeks' : 'months'}
                  </Text>
                </View>
              )}
              </View>
            )}

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

            {/* Goal End Date Option */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Goal End Date</Text>
              
              <View style={styles.toggleOption}>
                <Ionicons
                  name={hasEndDate ? 'calendar' : 'calendar-outline'}
                  size={22}
                  color="#5D87FF"
                />
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>Set End Date</Text>
                  <Text style={styles.toggleSubtext}>
                    {hasEndDate ? 'Goal will end on specific date' : 'Goal will run indefinitely (or until cycle ends)'}
                  </Text>
                </View>
                <Switch
                  trackColor={{ false: "#d9d9d9", true: "#a3c0ff" }}
                  thumbColor={hasEndDate ? "#5D87FF" : "#f4f3f4"}
                  ios_backgroundColor="#d9d9d9"
                  onValueChange={() => setHasEndDate(!hasEndDate)}
                  value={hasEndDate}
                  style={styles.switch}
                />
              </View>

              {hasEndDate && (
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#666" />
                  <Text style={styles.dateButtonText}>
                    {goalEndDate ? formatDate(goalEndDate) : 'Select End Date'}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {/* Date Pickers */}
          {showStartDatePicker && (
            <View>
              {Platform.OS === 'ios' ? (
                <View style={styles.datePickerContainer}>
                  <View style={styles.datePickerHeader}>
                    <TouchableOpacity onPress={handleDatePickerCancel}>
                      <Text style={styles.datePickerButton}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.datePickerTitle}>Select Start Date</Text>
                    <TouchableOpacity onPress={handleDatePickerDone}>
                      <Text style={[styles.datePickerButton, styles.datePickerDone]}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={goalStartDate}
                    mode="date"
                    display="spinner"
                    onChange={(event, date) => handleDateChange(event, date)}
                    minimumDate={new Date()}
                    style={styles.datePickerIOS}
                  />
                </View>
              ) : (
                <DateTimePicker
                  value={goalStartDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => handleDateChange(event, date)}
                  minimumDate={new Date()}
                />
              )}
            </View>
          )}

          {/* End Date Picker */}
          {showEndDatePicker && (
            <View style={styles.datePickerContainer}>
              {Platform.OS === 'ios' ? (
                <View style={styles.datePickerWrapper}>
                  <View style={styles.datePickerHeader}>
                    <TouchableOpacity onPress={handleEndDateCancel}>
                      <Text style={styles.datePickerButton}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleEndDateDone}>
                      <Text style={[styles.datePickerButton, styles.datePickerDone]}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={goalEndDate || new Date()}
                    mode="date"
                    display="spinner"
                    onChange={(event, date) => handleEndDateChange(event, date)}
                    minimumDate={goalStartDate}
                    style={styles.datePickerIOS}
                  />
                </View>
              ) : (
                <DateTimePicker
                  value={goalEndDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, date) => handleEndDateChange(event, date)}
                  minimumDate={goalStartDate}
                />
              )}
            </View>
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
    minHeight: height * 0.6,
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
    paddingTop: 16,
  },
  scrollContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#fafafa', // Temporary debug background
    padding: 8,
    borderRadius: 4,
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
  goalTypeContainer: {
    gap: 12,
  },
  goalTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  goalTypeOptionSelected: {
    borderColor: '#5D87FF',
    backgroundColor: '#f8f9ff',
  },
  goalTypeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  goalTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  goalTypeTextSelected: {
    color: '#5D87FF',
  },
  goalTypeSubtext: {
    fontSize: 14,
    color: '#666',
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
    overflow: 'hidden',
  },
  colorGradient: {
    width: '100%',
    height: '100%',
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
    overflow: 'hidden',
  },
  iconGradient: {
    width: '100%',
    height: '100%',
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
  sectionSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  daySelectionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    minWidth: 45,
    height: 45,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  dayButtonSelected: {
    backgroundColor: '#5D87FF',
    borderColor: '#5D87FF',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  dayButtonTextSelected: {
    color: '#fff',
  },
  dayButtonCheck: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  daySelectionError: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 8,
    fontStyle: 'italic',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  datePickerButton: {
    fontSize: 16,
    color: '#666',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  datePickerDone: {
    color: '#5D87FF',
    fontWeight: '600',
  },
  datePickerIOS: {
    height: 200,
    backgroundColor: '#fff',
  },
  durationOptionsContainer: {
    gap: 12,
  },
  durationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  durationOptionSelected: {
    borderColor: '#5D87FF',
    backgroundColor: '#f8f9ff',
  },
  durationOptionText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  durationOptionTextSelected: {
    color: '#5D87FF',
    fontWeight: '500',
  },
  customDurationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  customDurationInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  customDurationLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginTop: 12,
  },
  toggleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  toggleSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
});

export default AddGoalModal;