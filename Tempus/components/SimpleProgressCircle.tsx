import React from 'react';
import { View, Text } from 'react-native';

interface SimpleProgressCircleProps {
  progress: number;
  size: number;
  color: string;
  current: number;
  target: number;
}

const SimpleProgressCircle: React.FC<SimpleProgressCircleProps> = ({
  progress,
  size,
  color,
  current,
  target
}) => {
  const strokeWidth = 6;

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

export default SimpleProgressCircle;