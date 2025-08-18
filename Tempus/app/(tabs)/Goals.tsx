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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Types
interface Goal {
  id: string;
  title: string;
  description: string;
  targetCount: number;
  currentCount: number;
  period: 'daily' | 'weekly' | 'monthly';
  category: 'fitness' | 'work' | 'personal' | 'mindfulness' | 'learning';
  color: string;
  icon: string;
  createdAt: string;
  deadline?: string;
}

interface GoalCardProps {
  goal: Goal;
  onPress: () => void;
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
const GoalCard: React.FC<GoalCardProps> = ({ goal, onPress }) => {
  const progress = goal.targetCount > 0 ? goal.currentCount / goal.targetCount : 0;
  const progressPercentage = Math.min(progress * 100, 100);

  const getCategoryGradient = (category: string): readonly [string, string] => {
    switch (category) {
      case 'fitness':
        return ['#FF6B6B', '#FF8E8E'] as const;
      case 'work':
        return ['#4ECDC4', '#44A08D'] as const;
      case 'personal':
        return ['#A8E6CF', '#7FCDCD'] as const;
      case 'mindfulness':
        return ['#FFD93D', '#FF6B6B'] as const;
      case 'learning':
        return ['#6C5CE7', '#A29BFE'] as const;
      default:
        return ['#5D87FF', '#7B9CFF'] as const;
    }
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.goalCard}>
      <LinearGradient
        colors={getCategoryGradient(goal.category)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.goalCardGradient}
      >
        <View style={styles.goalCardContent}>
          <View style={styles.goalHeader}>
            <View style={styles.goalTitleContainer}>
              <Ionicons name={goal.icon as any} size={24} color="#fff" />
              <View style={styles.goalTitleText}>
                <Text style={styles.goalTitle}>{goal.title}</Text>
                <Text style={styles.goalPeriod}>{goal.period}</Text>
              </View>
            </View>
            <SimpleProgressCircle
              progress={progress}
              size={60}
              color="#fff"
              current={goal.currentCount}
              target={goal.targetCount}
            />
          </View>
          
          <Text style={styles.goalDescription}>{goal.description}</Text>
          
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
              <Text style={styles.progressText}>
                {goal.currentCount} / {goal.targetCount} completed
              </Text>
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
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: '1',
      title: 'Workout Routine',
      description: 'Complete gym sessions to stay mindfulnessy',
      targetCount: 3,
      currentCount: 1,
      period: 'weekly',
      category: 'fitness',
      color: '#FF6B6B',
      icon: 'fitness-outline',
      createdAt: '2025-08-01',
    },
    {
      id: '2',
      title: 'Learning Goals',
      description: 'Complete online courses and tutorials',
      targetCount: 5,
      currentCount: 3,
      period: 'weekly',
      category: 'learning',
      color: '#6C5CE7',
      icon: 'book-outline',
      createdAt: '2025-08-01',
    },
    {
      id: '3',
      title: 'Project Tasks',
      description: 'Finish important work projects',
      targetCount: 10,
      currentCount: 7,
      period: 'weekly',
      category: 'work',
      color: '#4ECDC4',
      icon: 'briefcase-outline',
      createdAt: '2025-08-01',
    },
    {
      id: '4',
      title: 'Daily Meditation',
      description: 'Practice mindfulness and relaxation',
      targetCount: 1,
      currentCount: 0,
      period: 'daily',
      category: 'mindfulness',
      color: '#FFD93D',
      icon: 'flower-outline',
      createdAt: '2025-08-01',
    },
  ]);

  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const filteredGoals = goals.filter(goal => goal.period === selectedPeriod);

  const handleGoalPress = (goal: Goal) => {
    console.log('Goal pressed:', goal.title);
    // Navigate to goal details or edit screen
  };

  const calculateOverallProgress = () => {
    if (filteredGoals.length === 0) return 0;
    const totalProgress = filteredGoals.reduce((sum, goal) => {
      return sum + (goal.currentCount / goal.targetCount);
    }, 0);
    return totalProgress / filteredGoals.length;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />
      
      <Header />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overview Section */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>This Week's Progress</Text>
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
                {filteredGoals.filter(goal => goal.currentCount >= goal.targetCount).length}
              </Text>
              <Text style={styles.statLabel}>Achieved</Text>
            </View>
          </View>
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
          {filteredGoals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onPress={() => handleGoalPress(goal)}
            />
          ))}
        </View>

        {/* Empty state */}
        {filteredGoals.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="flag-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No {selectedPeriod} goals yet</Text>
            <Text style={styles.emptyStateText}>
              Create your first {selectedPeriod} goal to start tracking your progress
            </Text>
          </View>
        )}
      </ScrollView>
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
  goalPeriod: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'capitalize',
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
});

export default GoalsScreen;