import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApi } from '../../context/ApiContext';
import { Goal, BaseGoal } from '../../types/goals';
import AddGoalModal from '../../components/AddGoalModal';

const { width } = Dimensions.get('window');

interface GoalCardProps {
  goal: Goal;
  onPress: () => void;
  onIncrement: () => void;
}

// Progress Circle Component
const ProgressCircle: React.FC<{
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
}> = ({ progress, size, strokeWidth, color }) => {
  const animatedProgress = new Animated.Value(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#f0f0f0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <Animated.View>
          {animatedProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, circumference],
          })}
        </Animated.View>
      </svg>
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Text style={{ fontSize: size * 0.15, fontWeight: 'bold', color }}>
          {Math.round(progress * 100)}%
        </Text>
      </View>
    </View>
  );
};

// Custom Progress Circle (simplified for React Native)
const SimpleProgressCircle: React.FC<{
  progress: number;
  size: number;
  color: string;
  current: number;
  target: number;
}> = ({ progress, size, color, current, target }) => {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progressOffset = circumference - (progress * circumference);

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {/* Background circle */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: '#e2e0e0ff',
          position: 'absolute',
        }}
      />
      {/* Progress overlay */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: 'transparent',
          borderTopColor: color,
          borderRightColor: progress > 0.25 ? color : 'transparent',
          borderBottomColor: progress > 0.5 ? color : 'transparent',
          borderLeftColor: progress > 0.75 ? color : 'transparent',
          position: 'absolute',
          transform: [{ rotate: '-90deg' }],
        }}
      />
      {/* Center content */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Text style={{ fontSize: size * 0.2, fontWeight: 'bold', color }}>
          {current}
        </Text>
        <Text style={{ fontSize: size * 0.12, color: '#666' }}>
          of {target}
        </Text>
      </View>
    </View>
  );
};

// Goal Card Component
const GoalCard: React.FC<GoalCardProps> = ({ goal, onPress, onIncrement }) => {
  const progress = goal.goal_target > 0 ? goal.goal_progress / goal.goal_target : 0;
  const progressPercentage = Math.min(progress * 100, 100);

  const getGoalGradient = (color: string): readonly [string, string] => {
    // Create a gradient by lightening the base color
    const baseColor = color || '#5D87FF';
    // For simplicity, we'll use the same color with slight variation
    return [baseColor, baseColor] as const;
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.goalCard}>
      <LinearGradient
        colors={getGoalGradient(goal.goal_color)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.goalCardGradient}
      >
        <View style={styles.goalCardContent}>
          <View style={styles.goalHeader}>
            <View style={styles.goalTitleContainer}>
              <Ionicons name={goal.goal_icon as any} size={24} color="#fff" />
              <View style={styles.goalTitleText}>
                <Text style={styles.goalTitle}>{goal.goal_name}</Text>
                <View style={styles.goalMetaContainer}>
                  <Text style={styles.goalPeriod}>{goal.goal_type}</Text>
                  {goal.goal_end_date && (
                    <Text style={styles.goalEndDate}>
                      • Ends {new Date(goal.goal_end_date).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
            </View>
            <SimpleProgressCircle
              progress={progress}
              size={60}
              color="#fff"
              current={goal.goal_progress}
              target={goal.goal_target}
            />
          </View>
          
          <Text style={styles.goalDescription}>{goal.goal_description}</Text>
          
          <View style={styles.goalFooter}>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${progressPercentage}%` }
                  ]} 
                />
              </View>
              <View style={styles.footerRow}>
                <Text style={styles.progressText}>
                  {goal.goal_progress} / {goal.goal_target} completed
                </Text>
                {goal.goal_progress < goal.goal_target && (
                  <TouchableOpacity style={styles.incrementButton} onPress={onIncrement}>
                    <Ionicons name="add" size={16} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Header Component
const Header: React.FC = () => {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.menuButton}>
        <Ionicons name="menu-outline" size={24} color="black" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Goals</Text>
      <View style={styles.headerRightContainer}>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="options-outline" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="add" size={24} color="black" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Main Goals Screen Component
const GoalsScreen: React.FC = () => {
  const { 
    goals, 
    goalLoading, 
    goalError, 
    refreshGoals, 
    incrementGoalProgress,
    addGoal
  } = useApi();
  
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);

  // Load goals on component mount
  useEffect(() => {
    refreshGoals();
  }, [refreshGoals]);

  const filteredGoals = goals.filter((goal: Goal) => {
    // Filter by goal type
    if (goal.goal_type !== selectedPeriod) return false;
    
    // Filter by date range - only show active goals
    const now = new Date();
    const startDate = new Date(goal.goal_start_date);
    const endDate = goal.goal_end_date ? new Date(goal.goal_end_date) : null;
    
    // Goal must have started
    if (startDate > now) return false;
    
    // If goal has end date, it must not have ended
    if (endDate && endDate < now) return false;
    
    return true;
  });

  const handleGoalPress = (goal: Goal) => {
    console.log('Goal pressed:', goal.goal_name);
    // Navigate to goal details or edit screen
  };

  const handleIncrementGoal = async (goalId: string) => {
    try {
      await incrementGoalProgress(goalId, 1);
      Alert.alert('Success', 'Goal progress updated!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update goal progress');
    }
  };

  const handleAddGoal = async (goalData: BaseGoal) => {
    try {
      await addGoal(goalData);
      Alert.alert('Success', 'Goal created successfully!');
      setShowAddGoalModal(false);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create goal');
    }
  };

  const calculateOverallProgress = () => {
    if (filteredGoals.length === 0) return 0;
    const totalProgress = filteredGoals.reduce((sum: number, goal: Goal) => {
      return sum + (goal.goal_progress / goal.goal_target);
    }, 0);
    return totalProgress / filteredGoals.length;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />
      
      <Header />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Error State */}
        {goalError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{goalError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refreshGoals}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Overview Section */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>
            {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Progress
          </Text>
          {goalLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading goals...</Text>
            </View>
          ) : (
            <View style={styles.overviewStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{filteredGoals.length}</Text>
                <Text style={styles.statLabel}>Active Goals</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {Math.round(calculateOverallProgress() * 100)}%
                </Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {filteredGoals.filter((goal: Goal) => goal.goal_progress >= goal.goal_target).length}
                </Text>
                <Text style={styles.statLabel}>Achieved</Text>
              </View>
            </View>
          )}
        </View>

        {/* Period Filter */}
        <View style={styles.filterContainer}>
          {(['daily', 'weekly', 'monthly'] as const).map(period => (
            <TouchableOpacity
              key={period}
              style={[
                styles.filterButton,
                selectedPeriod === period && styles.filterButtonActive
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.filterButtonText,
                selectedPeriod === period && styles.filterButtonTextActive
              ]}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Goals List */}
        <View style={styles.goalsContainer}>
          {!goalLoading && filteredGoals.map(goal => (
            <GoalCard
              key={goal.goal_id}
              goal={goal}
              onPress={() => handleGoalPress(goal)}
              onIncrement={() => handleIncrementGoal(goal.goal_id)}
            />
          ))}
        </View>

        {/* Empty state */}
        {filteredGoals.length === 0 && !goalLoading && (
          <View style={styles.emptyState}>
            <Ionicons name="flag-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No {selectedPeriod} goals yet</Text>
            <Text style={styles.emptyStateText}>
              Create your first {selectedPeriod} goal to start tracking your progress
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddGoalModal(true)}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Add Goal Modal */}
      <AddGoalModal
        visible={showAddGoalModal}
        onClose={() => setShowAddGoalModal(false)}
        onSave={handleAddGoal}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  headerRightContainer: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  overviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5D87FF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#f0f0f0',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: '#5D87FF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  goalsContainer: {
    paddingBottom: 20,
  },
  goalCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  goalCardGradient: {
    padding: 20,
  },
  goalCardContent: {
    flex: 1,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  goalTitleText: {
    marginLeft: 12,
    flex: 1,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  goalMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalPeriod: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'capitalize',
  },
  goalEndDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 4,
  },
  goalDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
    marginBottom: 16,
  },
  goalFooter: {
    marginTop: 8,
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incrementButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#c62828',
    padding: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5D87FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default GoalsScreen;