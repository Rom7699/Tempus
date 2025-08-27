import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useApi } from '../context/ApiContext';
import { Goal } from '../types/goals';
import { Task } from '../types/tasks';
import SimpleProgressCircle from '../components/SimpleProgressCircle';
import { createGradient } from '../utils/colorUtils';

const { width } = Dimensions.get('window');


const TaskItem: React.FC<{ task: Task; onToggle: (taskId: string) => void }> = ({ 
  task, 
  onToggle 
}) => {
  return (
    <TouchableOpacity 
      style={styles.taskItem} 
      onPress={() => onToggle(task.task_id)}
    >
      <View style={styles.taskContent}>
        <TouchableOpacity 
          style={[styles.checkbox, task.is_completed && styles.checkboxCompleted]}
          onPress={() => onToggle(task.task_id)}
        >
          {task.is_completed && (
            <Ionicons name="checkmark" size={16} color="#fff" />
          )}
        </TouchableOpacity>
        <View style={styles.taskTextContainer}>
          <Text style={[styles.taskTitle, task.is_completed && styles.taskTitleCompleted]}>
            {task.task_name}
          </Text>
          <Text style={styles.taskDate}>
            {new Date(task.task_start_date).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <Text style={[styles.taskPriority, { color: getPriorityColor(task.task_priority) }]}>
        {task.task_priority}
      </Text>
    </TouchableOpacity>
  );
};

const getPriorityColor = (priority: number | undefined): string => {
  switch (priority) {
    case 0: return '#FF6B6B';
    case 1: return '#FFB347';
    case 2: return '#4ECDC4';
    default: return '#666';
  }
};

export default function GoalDetailsScreen() {
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const { getGoalById, getTasksByGoalId, updateTask } = useApi();
  
  const [goal, setGoal] = useState<Goal | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (goalId) {
      loadGoalData();
    }
  }, [goalId]);

  const loadGoalData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [goalResponse, tasksResponse] = await Promise.all([
        getGoalById(parseInt(goalId)),
        getTasksByGoalId(parseInt(goalId))
      ]);
      
      setGoal(goalResponse.goal);
      setTasks(tasksResponse.tasksArr);
    } catch (err: any) {
      console.error('Error loading goal data:', err);
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

      await loadGoalData();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const getGoalGradient = (color: string): readonly [string, string] => {
    const gradient = createGradient(color || '#5D87FF');
    return gradient as const;
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

  if (error || !goal) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorMessage}>{error || 'Goal not found'}</Text>
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
      <StatusBar barStyle="light-content" backgroundColor={goal.goal_color || '#5D87FF'} />
      
      <LinearGradient
        colors={getGoalGradient(goal.goal_color)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerContent}>
          <View style={styles.goalInfo}>
            <Ionicons name={goal.goal_icon as any} size={32} color="#fff" />
            <View style={styles.goalTitleContainer}>
              <Text style={styles.goalTitle}>{goal.goal_name}</Text>
              <Text style={styles.goalType}>{goal.goal_type.toUpperCase()}</Text>
            </View>
          </View>
          
          <SimpleProgressCircle
            progress={progress}
            size={100}
            color="#fff"
            current={goal.goal_progress}
            target={goal.goal_target}
            backgroundColor="rgba(255, 255, 255, 0.3)"
            textColor="#fff"
            strokeWidth={8}
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
              {new Date(goal.goal_start_date).toLocaleDateString()}
            </Text>
          </View>
          {goal.goal_end_date && (
            <View style={styles.infoRow}>
              <Ionicons name="flag-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>End Date</Text>
              <Text style={styles.infoValue}>
                {new Date(goal.goal_end_date).toLocaleDateString()}
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

        {tasks.length > 0 && (
          <View style={styles.tasksSection}>
            <Text style={styles.sectionTitle}>Linked Tasks ({tasks.length})</Text>
            {tasks.map((task) => (
              <TaskItem
                key={task.task_id}
                task={task}
                onToggle={handleTaskToggle}
              />
            ))}
          </View>
        )}

        {tasks.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Linked Tasks</Text>
            <Text style={styles.emptyStateText}>
              This goal doesn't have any tasks linked to it yet.
            </Text>
          </View>
        )}
      </ScrollView>
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
  header: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  goalTitleContainer: {
    marginLeft: 16,
    flex: 1,
  },
  goalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  goalType: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  goalDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -20,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
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
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxCompleted: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  taskTextContainer: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  taskDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  taskPriority: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
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
});