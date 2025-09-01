import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '@/types/tasks';
import { List } from '@/types/lists';

interface UnlinkTasksModalProps {
  visible: boolean;
  onClose: () => void;
  onUnlink: (taskIds: string[]) => Promise<void>;
  tasks: Task[];
  list: List;
}

const UnlinkTasksModal: React.FC<UnlinkTasksModalProps> = ({
  visible,
  onClose,
  onUnlink,
  tasks,
  list
}) => {
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isUnlinking, setIsUnlinking] = useState(false);

  // Initialize with all tasks selected
  useEffect(() => {
    if (visible && tasks.length > 0) {
      setSelectedTaskIds(new Set(tasks.map(task => task.task_id)));
    }
  }, [visible, tasks]);

  const toggleTaskSelection = (taskId: string) => {
    const newSelected = new Set(selectedTaskIds);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTaskIds(newSelected);
  };

  const selectAll = () => {
    setSelectedTaskIds(new Set(tasks.map(task => task.task_id)));
  };

  const selectNone = () => {
    setSelectedTaskIds(new Set());
  };

  const handleUnlink = async () => {
    const selectedIds = Array.from(selectedTaskIds);
    if (selectedIds.length === 0) {
      Alert.alert("No Tasks Selected", "Please select at least one task to unlink.");
      return;
    }

    const taskCount = selectedIds.length;
    Alert.alert(
      "Unlink Selected Tasks",
      `Are you sure you want to unlink ${taskCount} task(s) from "${list.list_name}"?\n\nTasks will not be deleted, they will just be unlinked from this list.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: `Unlink ${taskCount} Task${taskCount > 1 ? 's' : ''}`,
          style: "destructive",
          onPress: async () => {
            setIsUnlinking(true);
            try {
              await onUnlink(selectedIds);
              onClose();
            } catch (error: any) {
              console.error("Error unlinking tasks:", error);
              Alert.alert("Error", error.message || "Failed to unlink tasks. Please try again.");
            } finally {
              setIsUnlinking(false);
            }
          },
        },
      ]
    );
  };

  const formatNiceDateTime = (date: string, time?: string): string => {
    if (!date) return "No date";
    
    const dateObj = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = dateObj.setHours(0,0,0,0) === today.setHours(0,0,0,0);
    const isTomorrow = dateObj.setHours(0,0,0,0) === tomorrow.setHours(0,0,0,0);
    
    // Format date part
    let dateStr = "";
    if (isToday) {
      dateStr = "Today";
    } else if (isTomorrow) {
      dateStr = "Tomorrow";
    } else {
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      };
      dateStr = dateObj.toLocaleDateString(undefined, options);
    }
    
    // Add time if provided
    if (time) {
      // Format from "HH:mm:ss" to "HH:mm" (24-hour format)
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const minute = parseInt(minutes, 10);
      const formattedHour = hour.toString().padStart(2, '0');
      const formattedMinute = minute.toString().padStart(2, '0');
      
      return `${dateStr}, ${formattedHour}:${formattedMinute}`;
    }
    
    return dateStr;
  };

  const getPriorityInfo = (priority: number) => {
    switch (priority) {
      case 1:
        return { text: 'Low', color: '#4CAF50' };
      case 2:
        return { text: 'Medium', color: '#FF9800' };
      case 3:
        return { text: 'High', color: '#F44336' };
      default:
        return { text: 'Low', color: '#4CAF50' };
    }
  };

  const renderTaskItem = ({ item }: { item: Task }) => {
    const isSelected = selectedTaskIds.has(item.task_id);
    const priorityInfo = getPriorityInfo(item.task_priority || 1);

    return (
      <TouchableOpacity
        style={[styles.taskItem, isSelected && styles.selectedTaskItem]}
        onPress={() => toggleTaskSelection(item.task_id)}
      >
        <View style={styles.checkbox}>
          {isSelected && <Ionicons name="checkmark" size={16} color="#5D87FF" />}
        </View>
        
        <View style={styles.taskContent}>
          <Text style={styles.taskName} numberOfLines={2}>{item.task_name}</Text>
          
          <View style={styles.taskMeta}>
            <View style={styles.taskDate}>
              <Text style={styles.taskDateText}>
                {item.task_start_date ? formatNiceDateTime(item.task_start_date, item.task_start_time) : 'No date/time set'}
              </Text>
            </View>
            
            <View style={[styles.priorityBadge, { backgroundColor: priorityInfo.color + '20' }]}>
              <Text style={[styles.priorityText, { color: priorityInfo.color }]}>
                {priorityInfo.text}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Unlink Tasks</Text>
            <TouchableOpacity onPress={handleUnlink} disabled={isUnlinking}>
              <Text style={[styles.unlinkButton, isUnlinking && styles.disabledButton]}>
                {isUnlinking ? 'Unlinking...' : 'Unlink'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* List info */}
          <View style={styles.listInfo}>
            <Text style={styles.listIcon}>{list.list_icon}</Text>
            <Text style={styles.listName}>{list.list_name}</Text>
          </View>

          {/* Selection controls */}
          <View style={styles.selectionControls}>
            <Text style={styles.selectionText}>
              {selectedTaskIds.size} of {tasks.length} tasks selected
            </Text>
            <View style={styles.selectionButtons}>
              <TouchableOpacity 
                style={styles.selectionButton} 
                onPress={selectAll}
                disabled={selectedTaskIds.size === tasks.length}
              >
                <Text style={[
                  styles.selectionButtonText,
                  selectedTaskIds.size === tasks.length && styles.disabledButtonText
                ]}>
                  Select All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.selectionButton} 
                onPress={selectNone}
                disabled={selectedTaskIds.size === 0}
              >
                <Text style={[
                  styles.selectionButtonText,
                  selectedTaskIds.size === 0 && styles.disabledButtonText
                ]}>
                  Select None
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tasks list */}
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.task_id}
            renderItem={renderTaskItem}
            style={styles.tasksList}
            contentContainerStyle={styles.tasksListContent}
          />

          {isUnlinking && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#5D87FF" />
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  unlinkButton: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '600',
  },
  disabledButton: {
    color: '#ccc',
  },
  listInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9ff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  listIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  listName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  selectionControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fafafa',
  },
  selectionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectionButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  selectionButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  selectionButtonText: {
    fontSize: 14,
    color: '#5D87FF',
    fontWeight: '500',
  },
  disabledButtonText: {
    color: '#ccc',
  },
  tasksList: {
    flex: 1,
  },
  tasksListContent: {
    paddingBottom: 20,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  selectedTaskItem: {
    backgroundColor: '#f8f9ff',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskDate: {
    flex: 1,
  },
  taskDateText: {
    fontSize: 12,
    color: '#666',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default UnlinkTasksModal;