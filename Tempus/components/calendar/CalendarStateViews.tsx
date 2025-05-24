import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

interface EmptyTasksViewProps {
  onAddTask: () => void;
}

export const EmptyTasksView: React.FC<EmptyTasksViewProps> = ({ onAddTask }) => (
  <View style={styles.emptyStateContainer}>
    <Text style={styles.emptyStateText}>No tasks for this day</Text>
    <TouchableOpacity style={styles.addTaskButton} onPress={onAddTask}>
      <Text style={styles.addTaskButtonText}>Add a task</Text>
    </TouchableOpacity>
  </View>
);

interface ErrorViewProps {
  message: string;
  onRetry: () => void;
}

export const ErrorView: React.FC<ErrorViewProps> = ({ message, onRetry }) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorText}>{message}</Text>
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <Text style={styles.retryButtonText}>Retry</Text>
    </TouchableOpacity>
  </View>
);

export const LoadingView: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#5D87FF" />
    <Text style={styles.loadingText}>Loading tasks...</Text>
  </View>
);

interface RefreshingIndicatorProps {
  visible: boolean;
}

export const RefreshingIndicator: React.FC<RefreshingIndicatorProps> = ({ visible }) => {
  if (!visible) return null;
  
  return (
    <View style={styles.refreshingIndicator}>
      <ActivityIndicator size="small" color="#5D87FF" />
    </View>
  );
};

const styles = StyleSheet.create({
  emptyStateContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  addTaskButton: {
    backgroundColor: '#5D87FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addTaskButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#fff8f8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffdddd',
    alignItems: 'center',
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#5D87FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  refreshingIndicator: {
    position: 'absolute',
    top: 330,
    left: 0,
    right: 0,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    zIndex: 999,
  },
});