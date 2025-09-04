import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CalendarHeaderProps {
  title: string;
  onMenuPress?: () => void;
  onSparklesPress?: () => void;
  onOptionsPress?: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  title,
  onMenuPress,
  onSparklesPress,
  onOptionsPress,
}) => (
  <View style={styles.header}>
    <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
      <Ionicons name="menu-outline" size={24} color="black" />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>{title}</Text>
    <View style={styles.headerRightContainer}>
      <TouchableOpacity style={styles.headerButton} onPress={onSparklesPress}>
        <Ionicons name="sparkles-outline" size={24} color="black" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.headerButton} onPress={onOptionsPress}>
        <Ionicons name="ellipsis-horizontal" size={24} color="black" />
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
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
});