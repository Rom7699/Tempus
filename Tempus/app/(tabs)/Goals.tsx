import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useApi } from '../../context/ApiContext';
import { Goal, BaseGoal } from '../../types/goals';
import AddGoalModal from '../../components/AddGoalModal';
import SimpleProgressCircle from '../../components/SimpleProgressCircle';
import GoalIncrementModal from '../../components/GoalIncrementModal';
import { createGradient } from '../../utils/colorUtils';


interface GoalCardProps {
  goal: Goal;
  onPress: () => void;
  onShowIncrement?: (goal: Goal) => void;
}



// Goal Card Component
const GoalCard: React.FC<GoalCardProps> = ({ goal, onPress, onShowIncrement }) => {
  const progress = goal.goal_target > 0 ? goal.goal_progress / goal.goal_target : 0;
  const progressPercentage = Math.min(progress * 100, 100);

  const getGoalGradient = (color: string): [string, string] => {
    const gradient = createGradient(color || '#5D87FF');
    // If goal is completed, use a slightly muted version
    if (goal.is_completed) {
      return [gradient[0] + '99', gradient[1] + 'CC'];
    }
    // If goal is inactive, use a more muted version
    if (goal.is_active === false) {
      return [gradient[0] + '66', gradient[1] + '99'];
    }
    return gradient;
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
                  {goal.is_cycling && (
                    <View style={styles.cycleIndicator}>
                      <Ionicons name="refresh-circle" size={12} color="rgba(255, 255, 255, 0.8)" />
                      <Text style={styles.cycleText}>cycling</Text>
                      {goal.goal_type === 'daily' && goal.goal_selected_days && (
                        <View style={styles.selectedDaysContainer}>
                          <Text style={styles.selectedDaysText}>
                            ({goal.goal_selected_days.map(day => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]).join(', ')})
                          </Text>
                        </View>
                      )}
                      {goal.goal_type !== 'daily' && goal.current_cycle_start && goal.current_cycle_end && (
                        <View style={styles.cycleRangeContainer}>
                          <Text style={styles.cycleRange}>
                            ({new Date(goal.current_cycle_start).toLocaleDateString()} - {new Date(goal.current_cycle_end).toLocaleDateString()})
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </View>
            <SimpleProgressCircle
              progress={progress}
              size={90}
              color="#fff"
              current={goal.goal_progress}
              target={goal.goal_target}
            />
          </View>
          
          <Text style={styles.goalDescription}>{goal.goal_description}</Text>
          
          <View style={styles.goalFooter}>
            <View style={styles.progressContainer}>
              <View style={styles.progressTextRow}>
                <Text style={styles.progressText}>
                  {goal.goal_progress} / {goal.goal_target} completed
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${progressPercentage}%` }
                  ]} 
                />
              </View>
              <View style={styles.footerRow}>
                <View style={styles.endDateInfo}>
                  <Text style={styles.goalEndText}>
                    {goal.goal_end_date ? 
                      <>Ends {new Date(goal.goal_end_date).toLocaleDateString()}</> : 
                      <>Forever <Ionicons name="infinite-outline" size={11} color="rgba(255, 255, 255, 0.6)" /></>
                    }
                  </Text>
                </View>
                {goal.goal_progress < goal.goal_target && !goal.is_completed && goal.is_active !== false && (
                  <TouchableOpacity 
                    style={styles.incrementButton} 
                    onPress={() => onShowIncrement && onShowIncrement(goal)}
                  >
                    <LinearGradient
                      colors={['#fff', 'rgba(255, 255, 255, 0.9)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.incrementButtonGradient}
                    >
                      <Ionicons name="add" size={12} color={goal.goal_color} />
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                {goal.is_completed && (
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.completedText}>Done!</Text>
                  </View>
                )}
                {goal.is_active === false && !goal.is_completed && (
                  <View style={styles.inactiveBadge}>
                    <Ionicons name="pause-circle" size={16} color="#FF9800" />
                    <Text style={styles.inactiveText}>Inactive</Text>
                  </View>
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
const Header: React.FC<{ onAddGoal: () => void }> = ({ onAddGoal }) => {
  return (
    <View style={styles.header}>
      <View style={styles.menuButton} />
      <Text style={styles.headerTitle}>Goals</Text>
      <View style={styles.headerRightContainer}>
        <TouchableOpacity style={styles.headerButton} onPress={onAddGoal}>
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
    updateGoal,
    addGoal
  } = useApi();
  
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [showIncrementModal, setShowIncrementModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  // Load goals on component mount
  useEffect(() => {
    refreshGoals();
  }, [refreshGoals]);

  const filteredGoals = goals.filter((goal: Goal) => {
    // Filter by goal type
    if (goal.goal_type !== selectedPeriod) return false;
    
    // Only show active and incomplete goals in main list
    if (goal.is_completed || goal.is_active === false) return false;
    
    // Filter by date range - only show active goals
    const now = new Date();
    const startDate = new Date(goal.goal_start_date);
    const endDate = goal.goal_end_date ? new Date(goal.goal_end_date) : null;
    
    // Goal must have started
    if (startDate > now) return false;
    
    // If goal has end date, it must not have ended (unless it's completed)
    if (endDate && endDate < now && !goal.is_completed) return false;
    
    return true;
  });

  const handleGoalPress = (goal: Goal) => {
    router.push({
      pathname: '/goal-details',
      params: { goalId: goal.goal_id.toString() }
    });
  };

  const handleShowIncrementModal = (goal: Goal) => {
    // Don't allow increment for inactive goals
    if (goal.is_active === false) {
      Alert.alert('Goal Inactive', 'This goal is currently inactive. Activate it first to make progress.');
      return;
    }
    setSelectedGoal(goal);
    setShowIncrementModal(true);
  };

  const handleIncrementGoal = async (amount: number = 1) => {
    if (!selectedGoal) return;
    
    try {
      // Don't increment if already at target
      if (selectedGoal.goal_progress >= selectedGoal.goal_target) {
        Alert.alert('Info', 'Goal already completed!');
        return;
      }

      // Increment progress by the specified amount
      const newProgress = Math.min(selectedGoal.goal_progress + amount, selectedGoal.goal_target);
      const isCompleted = newProgress >= selectedGoal.goal_target;
      
      await updateGoal({
        goal_id: selectedGoal.goal_id,
        goal_progress: newProgress,
        is_completed: isCompleted
      });
      
      if (isCompleted) {
        setTimeout(() => {
          Alert.alert('🎉 Congratulations!', 'You have completed your goal!');
        }, 1000);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update goal progress');
    }
  };

  const handleAddGoal = async (goalData: BaseGoal) => {
    try {
      await addGoal(goalData);
      // Don't close modal here - let AddGoalModal handle the closing animation
      Alert.alert('Success', 'Goal created successfully!');
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
      <StatusBar barStyle="dark-content" backgroundColor="#f1f4fe" />
      
      <Header onAddGoal={() => setShowAddGoalModal(true)} />
      
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
          {/* Show active goals with header */}
          {!goalLoading && filteredGoals.length > 0 && (
            <View style={styles.activeSection}>
              <Text style={styles.activeSectionTitle}>Active Goals</Text>
              {filteredGoals.map((goal: Goal) => (
                <GoalCard
                  key={goal.goal_id.toString()}
                  goal={goal}
                  onPress={() => handleGoalPress(goal)}
                  onShowIncrement={handleShowIncrementModal}
                />
              ))}
            </View>
          )}
          
          {/* Show completed goals separately */}
          {!goalLoading && goals.filter((goal: Goal) => 
            goal.goal_type === selectedPeriod && goal.is_completed
          ).length > 0 && (
            <View style={styles.completedSection}>
              <Text style={styles.completedSectionTitle}>Completed Goals</Text>
              {goals.filter((goal: Goal) => 
                goal.goal_type === selectedPeriod && goal.is_completed
              ).map((goal: Goal) => (
                <GoalCard
                  key={goal.goal_id.toString()}
                  goal={goal}
                  onPress={() => handleGoalPress(goal)}
                  onShowIncrement={handleShowIncrementModal}
                />
              ))}
            </View>
          )}

          {/* Show inactive goals separately */}
          {!goalLoading && goals.filter((goal: Goal) => 
            goal.goal_type === selectedPeriod && !goal.is_completed && goal.is_active === false
          ).length > 0 && (
            <View style={styles.inactiveSection}>
              <Text style={styles.inactiveSectionTitle}>Inactive Goals</Text>
              {goals.filter((goal: Goal) => 
                goal.goal_type === selectedPeriod && !goal.is_completed && goal.is_active === false
              ).map((goal: Goal) => (
                <GoalCard
                  key={goal.goal_id.toString()}
                  goal={goal}
                  onPress={() => handleGoalPress(goal)}
                  onShowIncrement={handleShowIncrementModal}
                />
              ))}
            </View>
          )}
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


      {/* Add Goal Modal */}
      <AddGoalModal
        visible={showAddGoalModal}
        onClose={() => setShowAddGoalModal(false)}
        onSave={handleAddGoal}
        goalType={selectedPeriod}
      />

      {/* Goal Increment Modal */}
      {selectedGoal && (
        <GoalIncrementModal
          visible={showIncrementModal}
          onClose={() => {
            setShowIncrementModal(false);
            setSelectedGoal(null);
          }}
          onIncrement={handleIncrementGoal}
          goalName={selectedGoal.goal_name}
          goalColor={selectedGoal.goal_color}
          currentProgress={selectedGoal.goal_progress}
          targetProgress={selectedGoal.goal_target}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f4fe',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    position: 'relative',
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
  cycleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  cycleText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 2,
  },
  endDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  goalEndDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 2,
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
    borderRadius: 12,
    width: 24,
    height: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  incrementButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
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
  completedSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  completedSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    paddingLeft: 4,
  },
  inactiveSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  inactiveSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: 12,
    paddingLeft: 4,
  },
  activeSection: {
    marginBottom: 16,
  },
  activeSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 12,
    paddingLeft: 4,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
    marginLeft: 4,
  },
  inactiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inactiveText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    marginLeft: 4,
  },
  progressTextRow: {
    marginBottom: 8,
  },
  endDateInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  goalEndText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 6,
    marginBottom: -4,
    marginLeft: 4,
  },
  cycleRangeContainer: {
    marginLeft: 4,
  },
  cycleRange: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  selectedDaysContainer: {
    marginLeft: 4,
  },
  selectedDaysText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});

export default GoalsScreen;