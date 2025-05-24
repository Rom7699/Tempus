import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseList, List } from '@/types/lists';

const { height } = Dimensions.get('window');

// A selection of modern, colorful emojis that represent different categories
const availableEmojis = [
  '🏠', '💼', '🛒', '🎓', '❤️', '⏰', '🏖️', '💪',
  '🍽️', '🎬', '🚗', '✈️', '🏥', '📚', '🎮', '🏆',
  '👶', '🎸', '🍔', '💻', '🎨', '🎧', '🐶', '🏃',
  '🌿', '🍕', '☕', '🎁', '🌎', '🔬', '🏛️', '🧠',
  '🍎', '🥑', '🥗', '🚴', '⚽', '🏊', '🎭', '📱'
];

// Vibrant color palette
const vibrantColors = [
  '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0',
  '#118AB2', '#073B4C', '#F15BB5', '#7209B7',
  '#3A86FF', '#FB5607', '#FCBF49', '#F72585',
  '#4361EE', '#480CA8', '#B5179E', '#560BAD',
  '#FF9A8B', '#01BAEF', '#FFCB77', '#00F5D4',
  '#845EC2', '#FF8066', '#4FFBDF', '#FFC75F',
  '#00C9A7', '#C34A36', '#D65DB1', '#FF6F91',
  '#FF9671', '#008F7A', '#9C27B0', '#4CAF50',
];

interface AddListModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (newList: BaseList) => Promise<List>;
}

const AddListModal: React.FC<AddListModalProps> = ({ visible, onClose, onSave }) => {
  const [listName, setListName] = useState('');
  const [listIcon, setListIcon] = useState('🏠');
  const [listColor, setListColor] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const translateY = useState(new Animated.Value(height))[0];
  const backdropOpacity = useState(new Animated.Value(0))[0];

  // Generate a random color when the modal opens
  useEffect(() => {
    if (visible) {
      generateRandomColor();
      animateIn();
    }
  }, [visible]);

  // Animation functions
  const animateIn = () => {
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

  // Function to generate a random color
  const generateRandomColor = () => {
    const randomIndex = Math.floor(Math.random() * vibrantColors.length);
    setListColor(vibrantColors[randomIndex]);
  };

  // Handle color selection
  const handleColorSelect = (color: string) => {
    setListColor(color);
  };

  // Handle save
  const handleSave = async () => {
    if (listName.trim() === '') {
      setError('Please enter a list name');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      // Format the list data according to what your API expects
      const newList: BaseList = {
        list_name: listName.trim(),
        list_icon: listIcon,
        list_color: listColor,
      };

      await onSave(newList);
      resetForm();
      animateOut(onClose);
    } catch (error: any) {
      console.error('Error saving list:', error);
      setError(error?.message || 'Failed to create list');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setListName('');
    setListIcon('🏠');
    setError(null);
    // Color will be regenerated next time the modal opens
  };

  // Handle close
  const handleClose = () => {
    animateOut(() => {
      resetForm();
      onClose();
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidContainer}
        >
          <Animated.View
            style={[styles.modal, { transform: [{ translateY }] }]}
          >
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.title}>Create New List</Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            {/* Error message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.content}>
              {/* List Name Input */}
              <Text style={styles.inputLabel}>List Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter list name"
                value={listName}
                onChangeText={setListName}
              />

              {/* Icon Selection */}
              <Text style={styles.inputLabel}>Choose Icon</Text>
              <FlatList
                data={availableEmojis}
                keyExtractor={(item) => item}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.emojiItem,
                      listIcon === item && styles.selectedEmojiItem,
                    ]}
                    onPress={() => setListIcon(item)}
                  >
                    <Text style={styles.emoji}>{item}</Text>
                  </TouchableOpacity>
                )}
                style={styles.emojiSelector}
              />

              {/* Color Selection */}
              <Text style={styles.inputLabel}>Choose Color</Text>
              <FlatList
                data={vibrantColors}
                keyExtractor={(item) => item}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.colorItem,
                      { backgroundColor: item },
                      listColor === item && styles.selectedColorItem,
                    ]}
                    onPress={() => handleColorSelect(item)}
                  />
                )}
                style={styles.colorSelector}
              />
            </View>

            {/* Buttons */}
            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Create List</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  keyboardAvoidContainer: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: height * 0.9,
    paddingBottom: Platform.OS === 'ios' ? 30 : 0,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#e0e0e0',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#fff8f8',
    padding: 10,
    margin: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffdddd',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  emojiSelector: {
    marginBottom: 20,
  },
  emojiItem: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#f5f5f5',
  },
  selectedEmojiItem: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  emoji: {
    fontSize: 24,
  },
  colorSelector: {
    marginBottom: 20,
  },
  colorItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  selectedColorItem: {
    borderWidth: 2,
    borderColor: '#333',
  },
  buttons: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#5D87FF',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '500',
    fontSize: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 16,
  },
});

export default AddListModal;