import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Goal } from "@/types/goals";

const { height } = Dimensions.get("window");

interface GoalSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  availableGoals: Goal[];
  selectedGoal: Goal | null;
  onSelectGoal: (goal: Goal | null) => void;
}

const GoalSelectionModal: React.FC<GoalSelectionModalProps> = ({
  visible,
  onClose,
  availableGoals,
  selectedGoal,
  onSelectGoal,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const translateY = useState(new Animated.Value(height))[0];
  const backdropOpacity = useState(new Animated.Value(0))[0];

  // Filter goals by selected period and active date range
  const filteredGoals = availableGoals.filter((goal: Goal) => {
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

  React.useEffect(() => {
    if (visible) {
      // Animate in
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
    }
  }, [visible, backdropOpacity, translateY]);

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

  const handleSelectGoal = (goal: Goal) => {
    onSelectGoal(goal);
    animateOut(onClose);
  };

  const handleClearGoal = () => {
    onSelectGoal(null);
    animateOut(onClose);
  };

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

  const renderGoalItem = ({ item }: { item: Goal }) => {
    const progress = item.goal_target > 0 ? (item.goal_progress / item.goal_target) * 100 : 0;
    const colors = [item.goal_color, item.goal_color];

    return (
      <TouchableOpacity
        style={[
          styles.goalItem,
          selectedGoal?.goal_id === item.goal_id && styles.selectedGoalItem,
        ]}
        onPress={() => handleSelectGoal(item)}
      >
        <View style={[styles.goalIconContainer, { backgroundColor: colors[0] }]}>
          <Ionicons name={item.goal_icon as any} size={20} color="#fff" />
        </View>
        <View style={styles.goalContent}>
          <Text style={styles.goalTitle}>{item.goal_name}</Text>
          <Text style={styles.goalDescription} numberOfLines={2}>
            {item.goal_description}
          </Text>
          <View style={styles.goalMeta}>
            <Text style={styles.goalType}>{item.goal_type}</Text>
            {item.goal_end_date && (
              <Text style={styles.goalEndDateText}>
                • Ends {new Date(item.goal_end_date).toLocaleDateString()}
              </Text>
            )}
          </View>
          <View style={styles.goalProgress}>
            <Text style={styles.goalProgressText}>
              {item.goal_progress}/{item.goal_target} • {Math.round(progress)}%
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: colors[0] }]} />
            </View>
          </View>
        </View>
        {selectedGoal?.goal_id === item.goal_id && (
          <Ionicons name="checkmark" size={20} color="#5D87FF" />
        )}
      </TouchableOpacity>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
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

          <View style={styles.header}>
            <Text style={styles.title}>Select Goal</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#999" />
            </TouchableOpacity>
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
          <FlatList
            data={filteredGoals}
            renderItem={renderGoalItem}
            keyExtractor={(item) => item.goal_id}
            style={styles.goalContainer}
            contentContainerStyle={styles.goalList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="flag-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateTitle}>No {selectedPeriod} goals</Text>
                <Text style={styles.emptyStateText}>
                  Create your first {selectedPeriod} goal in the Goals tab
                </Text>
              </View>
            }
          />

          {/* Clear Goal Button */}
          <TouchableOpacity
            style={styles.clearGoalButton}
            onPress={handleClearGoal}
          >
            <Ionicons name="close-circle-outline" size={22} color="#FF6B6B" />
            <Text style={styles.clearGoalText}>No Goal</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    minHeight: height * 0.6,
    maxHeight: height * 0.85,
    paddingBottom: 30,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "#e0e0e0",
    borderRadius: 2.5,
    alignSelf: "center",
    marginTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 4,
    margin: 16,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
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
  goalContainer: {
    maxHeight: height * 0.4,
  },
  goalList: {
    paddingHorizontal: 16,
  },
  goalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  selectedGoalItem: {
    backgroundColor: "#f8f9fe",
  },
  goalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  goalContent: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: "#333",
    marginBottom: 4,
  },
  goalDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  goalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalType: {
    fontSize: 12,
    color: '#888',
    textTransform: 'capitalize',
  },
  goalEndDateText: {
    fontSize: 11,
    color: '#aaa',
    marginLeft: 4,
  },
  goalProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalProgressText: {
    fontSize: 12,
    color: '#888',
    marginRight: 8,
    minWidth: 80,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  clearGoalButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  clearGoalText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#FF6B6B",
    fontWeight: "500",
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});

export default GoalSelectionModal;