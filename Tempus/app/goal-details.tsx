import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useApi } from '../context/ApiContext';
import { Goal, BaseGoal } from '../types/goals';
import { Task } from '../types/tasks';
import SimpleProgressCircle from '../components/SimpleProgressCircle';
import AddGoalModal from '../components/AddGoalModal';
import TaskDetailItem from '../components/NewTaskItem';
import DisplayTaskModal from '../components/DisplayTaskModal';
import { createGradient } from '../utils/colorUtils';

const { width } = Dimensions.get('window');



export default function GoalDetailsScreen() {
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const { getGoalById, getTasksByGoalId, updateTask, updateGoal, deleteGoal } = useApi();
  
  const [goal, setGoal] = useState<Goal | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskModalVisible, setTaskModalVisible] = useState(false);

  // Sort tasks: incomplete tasks first (sorted by date, latest first), then completed tasks
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // First, separate completed and incomplete tasks
      if (a.is_completed !== b.is_completed) {
        return a.is_completed ? 1 : -1; // Completed tasks go to bottom
      }
      
      // Within each group, sort by date (latest first)
      const dateA = a.task_start_date ? new Date(a.task_start_date).getTime() : 0;
      const dateB = b.task_start_date ? new Date(b.task_start_date).getTime() : 0;
      
      // Latest dates first (descending order)
      return dateB - dateA;
    });
  }, [tasks]);

  useEffect(() => {
    console.log('GoalDetailsScreen - Received goalId:', goalId);
    console.log('GoalDetailsScreen - goalId type:', typeof goalId);
    if (goalId) {
      loadGoalData();
    } else {
      console.error('GoalDetailsScreen - No goalId provided');
      setError('No goal ID provided');
      setLoading(false);
    }
  }, [goalId]);

  const loadGoalData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('loadGoalData - Starting data fetch for goalId:', goalId);
      console.log('loadGoalData - Parsed goalId:', parseInt(goalId));
      
      // Load goal and tasks separately to handle partial failures
      const goalResponse = await getGoalById(parseInt(goalId));
      console.log('loadGoalData - Goal response:', goalResponse);
      setGoal(goalResponse.goal);

      try {
        const tasksResponse = await getTasksByGoalId(parseInt(goalId));
        console.log('loadGoalData - Tasks response:', tasksResponse);
        setTasks(tasksResponse.tasksArr || []);
      } catch (taskError: any) {
        console.warn('Failed to load tasks for goal, continuing with empty array:', taskError);
        setTasks([]);
        // Don't throw error here, just continue with empty tasks
      }
    } catch (err: any) {
      console.error('Error loading goal data:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError(err.message || 'Failed to load goal details');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskToggle = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.task_id === taskId);
      if (!task) return;

      await updateTask({
        task_id: taskId,
        is_completed: !task.is_completed,
      });

      setTasks(prev => 
        prev.map(t => 
          t.task_id === taskId 
            ? { ...t, is_completed: !t.is_completed }
            : t
        )
      );
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const handleTaskPress = (task: Task) => {
    setSelectedTask(task);
    setTaskModalVisible(true);
  };

  const handleMarkGoalComplete = async () => {
    if (!goal) return;
    
    try {
      await updateGoal({
        goal_id: goal.goal_id,
        is_completed: !goal.is_completed,
      });
      
      Alert.alert(
        'Success', 
        `Goal marked as ${!goal.is_completed ? 'completed' : 'incomplete'}!`
      );
      
      await loadGoalData();
      setShowMenu(false);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update goal status');
    }
  };

  const handleDeleteGoal = async () => {
    if (!goal) return;

    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${goal.goal_name}"?\n\nThis will also unlink all associated tasks. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGoal(goal.goal_id);
              Alert.alert('Success', 'Goal deleted successfully!');
              router.back();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete goal. Please try again.');
            }
          },
        },
      ]
    );
    setShowMenu(false);
  };

  const handleEditGoal = () => {
    setShowMenu(false);
    setShowEditModal(true);
  };

  const handleSaveEditedGoal = async (goalData: BaseGoal) => {
    if (!goal) return;

    try {
      // Create update data with the goal_id and all the updated fields
      const updateData = {
        goal_id: goal.goal_id,
        goal_name: goalData.goal_name,
        goal_description: goalData.goal_description,
        goal_target: goalData.goal_target,
        goal_type: goalData.goal_type,
        goal_color: goalData.goal_color,
        goal_icon: goalData.goal_icon,
        goal_start_date: goalData.goal_start_date,
        goal_selected_days: goalData.goal_selected_days,
      };

      await updateGoal(updateData);
      Alert.alert('Success', 'Goal updated successfully!');
      await loadGoalData(); // Refresh the goal data
      setShowEditModal(false);
    } catch (error: any) {
      console.error('Error updating goal:', error);
      Alert.alert('Error', 'Failed to update goal. Please try again.');
    }
  };

  const getGoalGradient = (color: string): readonly [string, string] => {
    const gradient = createGradient(color || '#5D87FF');
    return gradient;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#5D87FF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5D87FF" />
          <Text style={styles.loadingText}>Loading goal details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || (!loading && !goal)) {
    const isNetworkError = error && (error.includes('Network') || error.includes('fetch'));
    const isNotFoundError = error && (error.includes('Not Found') || error.includes('not found'));
    const isMissingIdError = error && error.includes('No goal ID provided');
    
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f1f4fe" />
        <View style={styles.errorContainer}>
          <Ionicons 
            name={
              isMissingIdError ? "help-circle-outline" :
              isNotFoundError ? "search-outline" :
              isNetworkError ? "wifi-outline" :
              "alert-circle-outline"
            } 
            size={48} 
            color="#FF6B6B" 
          />
          <Text style={styles.errorTitle}>
            {isMissingIdError ? "Invalid Goal" :
             isNotFoundError ? "Goal Not Found" :
             isNetworkError ? "Connection Error" :
             "Error"}
          </Text>
          <Text style={styles.errorMessage}>
            {isMissingIdError ? "No goal ID was provided. Please go back and try again." :
             isNotFoundError ? "This goal could not be found. It may have been deleted or you don't have access to it." :
             isNetworkError ? "Unable to connect to the server. Please check your internet connection." :
             error || 'Failed to load goal details. Please try again.'}
          </Text>
          
          {!isMissingIdError && (
            <TouchableOpacity style={styles.retryButton} onPress={loadGoalData}>
              <Text style={styles.retryButtonText}>
                {isNetworkError ? 'Retry Connection' : 'Try Again'}
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.retryButton, styles.errorBackButton]} 
            onPress={() => router.back()}
          >
            <Text style={[styles.retryButtonText, styles.backButtonText]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Additional null check for TypeScript
  if (!goal) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f1f4fe" />
        <View style={styles.errorContainer}>
          <Ionicons name="help-circle-outline" size={48} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Goal Not Available</Text>
          <Text style={styles.errorMessage}>The goal data is not available.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadGoalData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const progress = goal.goal_target > 0 ? goal.goal_progress / goal.goal_target : 0;
  const progressPercentage = Math.min(progress * 100, 100);
  const completedTasks = tasks.filter(task => task.is_completed).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
      
      <LinearGradient
        colors={getGoalGradient(goal.goal_color)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreButton} onPress={() => setShowMenu(true)}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerContent}>
          <View style={styles.goalInfo}>
            <Ionicons name={goal.goal_icon as any} size={20} color="#fff" />
            <View style={styles.goalTitleContainer}>
              <Text style={styles.goalTitle}>{goal.goal_name}</Text>
              <Text style={styles.goalType}>{goal.goal_type.toUpperCase()}</Text>
            </View>
          </View>
          
          <SimpleProgressCircle
            progress={progress}
            size={55}
            color="#fff"
            current={goal.goal_progress}
            target={goal.goal_target}
            backgroundColor="rgba(255, 255, 255, 0.3)"
            textColor="#fff"
            strokeWidth={5}
          />
        </View>
        
        <Text style={styles.goalDescription}>{goal.goal_description}</Text>
        
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${progressPercentage}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round(progressPercentage)}% Complete
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{goal.goal_progress}</Text>
            <Text style={styles.statLabel}>Current Progress</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{goal.goal_target}</Text>
            <Text style={styles.statLabel}>Target</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{tasks.length}</Text>
            <Text style={styles.statLabel}>Linked Tasks</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{completedTasks}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Start Date</Text>
            <Text style={styles.infoValue}>
              {goal.goal_start_date ? new Date(goal.goal_start_date).toLocaleDateString() : 'No date'}
            </Text>
          </View>
          {goal.goal_end_date && (
            <View style={styles.infoRow}>
              <Ionicons name="flag-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>End Date</Text>
              <Text style={styles.infoValue}>
                {goal.goal_end_date ? new Date(goal.goal_end_date).toLocaleDateString() : 'No date'}
              </Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[styles.infoValue, { 
              color: goal.is_completed ? '#4CAF50' : '#FF9800' 
            }]}>
              {goal.is_completed ? 'Completed' : 'In Progress'}
            </Text>
          </View>
        </View>

        {sortedTasks.length > 0 && (
          <View style={styles.tasksSection}>
            <Text style={styles.sectionTitle}>Linked Tasks ({sortedTasks.length})</Text>
            {sortedTasks.map((task) => (
              <TaskDetailItem
                key={task.task_id}
                task={task}
                onPress={handleTaskPress}
                showCompleteButton={true}
                onToggleComplete={handleTaskToggle}
              />
            ))}
          </View>
        )}

        {sortedTasks.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Linked Tasks</Text>
            <Text style={styles.emptyStateText}>
              This goal doesn't have any tasks linked to it yet.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleEditGoal}>
              <Ionicons name="create-outline" size={20} color="#333" />
              <Text style={styles.menuItemText}>Edit Goal</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={handleMarkGoalComplete}
            >
              <Ionicons 
                name={goal?.is_completed ? "checkmark-circle" : "checkmark-circle-outline"} 
                size={20} 
                color={goal?.is_completed ? "#4CAF50" : "#333"} 
              />
              <Text style={[
                styles.menuItemText,
                goal?.is_completed && { color: "#4CAF50" }
              ]}>
                {goal?.is_completed ? 'Mark as Incomplete' : 'Mark as Complete'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, styles.deleteMenuItem]} 
              onPress={handleDeleteGoal}
            >
              <Ionicons name="trash-outline" size={20} color="#FF4444" />
              <Text style={[styles.menuItemText, styles.deleteMenuText]}>Delete Goal</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Goal Modal */}
      {goal && (
        <AddGoalModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveEditedGoal}
          goalType={goal.goal_type}
          initialData={goal}
        />
      )}

      {/* Task Display Modal */}
      {selectedTask && (
        <DisplayTaskModal
          visible={taskModalVisible}
          task={selectedTask}
          onClose={() => {
            setTaskModalVisible(false);
            setSelectedTask(null);
          }}
          onUpdate={async () => {
            await loadGoalData();
          }}
          onDelete={async () => {
            await loadGoalData();
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#5D87FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBackButton: {
    backgroundColor: '#6c757d',
    marginTop: 12,
  },
  backButtonText: {
    color: '#fff',
  },
  header: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  goalTitleContainer: {
    marginLeft: 10,
    flex: 1,
  },
  goalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  goalType: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  goalDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
    marginBottom: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  tasksSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
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
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  deleteMenuItem: {
    borderBottomWidth: 0,
  },
  deleteMenuText: {
    color: '#FF4444',
  },
});