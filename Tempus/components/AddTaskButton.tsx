import React from 'react';
import { StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FloatingActionButtonProps {
  onPress: () => void;
  customPosition?: {
    bottom?: number;
    right?: number;
  };
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ 
  onPress,
  customPosition
}) => {
  // Get safe area insets to avoid notches and home indicators
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;
  
  // Calculate default position to be consistent across screens
  const defaultBottom = Platform.OS === 'ios' ? Math.max(20, insets.bottom) + 60 : 80;
  const defaultRight = Math.min(24, screenWidth * 0.06); // 6% of screen width or 24px, whichever is smaller
  
  const buttonStyle = {
    ...styles.fab,
    right: customPosition?.right !== undefined ? customPosition.right : defaultRight,
    bottom: customPosition?.bottom !== undefined ? customPosition.bottom : defaultBottom
  };
  
  return (
    <TouchableOpacity style={buttonStyle} onPress={onPress}>
      <Ionicons name="add" size={30} color="white" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5D87FF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000, // Ensure it's above other elements
  },
});

export default FloatingActionButton;