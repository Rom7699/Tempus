import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createGradient } from '../utils/colorUtils';

const { width, height } = Dimensions.get('window');

interface GoalIncrementModalProps {
  visible: boolean;
  onClose: () => void;
  onIncrement: (amount: number) => void;
  goalName: string;
  goalColor: string;
  currentProgress: number;
  targetProgress: number;
}

const cuteMessages = [
  "One step closer! 🎯",
  "You're crushing it! 💪",
  "Progress is progress! 🌟",
  "Keep going, superstar! ⭐",
  "Amazing work! 🎉",
  "You're on fire! 🔥",
  "Way to go, champion! 🏆",
  "Small wins, big impact! ✨",
  "You're unstoppable! 🚀",
  "Making it happen! 💫",
  "Another win in the books! 📚",
  "You're doing great! 👏",
];

const GoalIncrementModal: React.FC<GoalIncrementModalProps> = ({
  visible,
  onClose,
  onIncrement,
  goalName,
  goalColor,
  currentProgress,
  targetProgress,
}) => {
  const [message, setMessage] = useState('');
  const [incrementAmount, setIncrementAmount] = useState(1);
  const translateY = useRef(new Animated.Value(height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const swipeTranslateX = useRef(new Animated.Value(0)).current;
  const swipeOpacity = useRef(new Animated.Value(1)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Pick a random cute message
      const randomMessage = cuteMessages[Math.floor(Math.random() * cuteMessages.length)];
      setMessage(randomMessage);
      
      // Reset animations and increment amount
      swipeTranslateX.setValue(0);
      swipeOpacity.setValue(1);
      checkmarkScale.setValue(0);
      setIncrementAmount(1);
      
      animateIn();
    }
  }, [visible]);

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0.6,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

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

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: swipeTranslateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;
      
      // If swiped right enough (more than 60% of swipe area or fast swipe)
      if (translationX > 120 || velocityX > 500) {
        // Complete the swipe animation
        Animated.parallel([
          Animated.timing(swipeTranslateX, {
            toValue: 200,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(swipeOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Show checkmark animation
          Animated.sequence([
            Animated.spring(checkmarkScale, {
              toValue: 1.2,
              tension: 100,
              friction: 8,
              useNativeDriver: true,
            }),
            Animated.spring(checkmarkScale, {
              toValue: 1,
              tension: 100,
              friction: 8,
              useNativeDriver: true,
            }),
          ]).start();
          
          // Increment the goal and close modal after a delay
          setTimeout(() => {
            onIncrement(incrementAmount);
            setTimeout(() => {
              animateOut(onClose);
            }, 800);
          }, 100);
        });
      } else {
        // Snap back to original position
        Animated.spring(swipeTranslateX, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  const gradient = createGradient(goalColor);
  const progress = targetProgress > 0 ? currentProgress / targetProgress : 0;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={() => animateOut(onClose)}
    >
      <GestureHandlerRootView style={styles.container}>
        <TouchableWithoutFeedback onPress={() => animateOut(onClose)}>
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.modal, { transform: [{ translateY }] }]}>
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalGradient}
          >
            <View style={styles.content}>
              {/* Goal Info */}
              <View style={styles.goalInfo}>
                <Text style={styles.goalName}>{goalName}</Text>
                <Text style={styles.progressText}>
                  {currentProgress} / {targetProgress}
                </Text>
              </View>

              {/* Cute Message */}
              <Text style={styles.message}>{message}</Text>

              {/* Increment Amount Selector */}
              <View style={styles.incrementSelector}>
                <Text style={styles.incrementLabel}>Add to progress:</Text>
                <View style={styles.incrementControls}>
                  <TouchableWithoutFeedback 
                    onPress={() => setIncrementAmount(Math.max(1, incrementAmount - 1))}
                  >
                    <View style={styles.incrementButton}>
                      <Ionicons name="remove" size={11} color="#fff" />
                    </View>
                  </TouchableWithoutFeedback>
                  
                  <View style={styles.incrementAmountContainer}>
                    <Text style={styles.incrementAmount}>{incrementAmount}</Text>
                  </View>
                  
                  <TouchableWithoutFeedback 
                    onPress={() => setIncrementAmount(Math.min(targetProgress - currentProgress, incrementAmount + 1))}
                  >
                    <View style={styles.incrementButton}>
                      <Ionicons name="add" size={11} color="#fff" />
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </View>

              {/* Success Checkmark (hidden initially) */}
              <Animated.View 
                style={[
                  styles.checkmarkContainer,
                  { 
                    transform: [{ scale: checkmarkScale }],
                    opacity: checkmarkScale.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    })
                  }
                ]}
              >
                <Ionicons name="checkmark-circle" size={60} color="#fff" />
                <Text style={styles.successText}>Progress Updated! 🎉</Text>
              </Animated.View>

              {/* Swipe Area */}
              <Animated.View 
                style={[
                  styles.swipeContainer,
                  { opacity: swipeOpacity }
                ]}
              >
                <View style={styles.swipeTrack}>
                  <PanGestureHandler
                    onGestureEvent={onGestureEvent}
                    onHandlerStateChange={onHandlerStateChange}
                  >
                    <Animated.View
                      style={[
                        styles.swipeThumb,
                        { 
                          transform: [{ 
                            translateX: swipeTranslateX.interpolate({
                              inputRange: [0, 200],
                              outputRange: [0, 200],
                              extrapolate: 'clamp',
                            })
                          }] 
                        }
                      ]}
                    >
                      <Ionicons name="chevron-forward" size={24} color={goalColor} />
                    </Animated.View>
                  </PanGestureHandler>
                  
                  <View style={styles.swipeTextContainer}>
                    <Text style={styles.swipeText}>
                      Swipe to add {incrementAmount} more →
                    </Text>
                  </View>
                </View>
              </Animated.View>

              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(progress * 100, 100)}%` }
                    ]}
                  />
                </View>
                <Text style={styles.progressPercentage}>
                  {Math.round(progress * 100)}% Complete
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  modal: {
    width: width * 0.9,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalGradient: {
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
  },
  goalInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  goalName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  message: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 32,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  checkmarkContainer: {
    alignItems: 'center',
    position: 'absolute',
    top: '50%',
    marginTop: -50,
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
    textAlign: 'center',
  },
  swipeContainer: {
    width: '100%',
    marginBottom: 24,
  },
  swipeTrack: {
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 30,
    position: 'relative',
    justifyContent: 'center',
  },
  swipeThumb: {
    position: 'absolute',
    left: 4,
    width: 52,
    height: 52,
    backgroundColor: '#fff',
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  swipeTextContainer: {
    position: 'absolute',
    right: 20,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  swipeText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  progressBarContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  incrementSelector: {
    alignItems: 'center',
    marginBottom: 19,
  },
  incrementLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  incrementControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  incrementButton: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 3,
  },
  incrementAmountContainer: {
    minWidth: 32,
    paddingHorizontal: 10,
    paddingVertical: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incrementAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default GoalIncrementModal;