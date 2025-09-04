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
  ScrollView,
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

interface EditListModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (updateData: Partial<BaseList>) => Promise<void>;
  list: List;
}

const EditListModal: React.FC<EditListModalProps> = ({ visible, onClose, onSave, list }) => {
  const [listName, setListName] = useState('');
  const [listColor, setListColor] = useState('#FF6B6B');
  const [listIcon, setListIcon] = useState('🏠');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with current list data
  useEffect(() => {
    if (visible && list) {
      setListName(list.list_name || '');
      setListColor(list.list_color || '#FF6B6B');
      setListIcon(list.list_icon || '🏠');
      setError(null);
    }
  }, [visible, list]);

  const handleSave = async () => {
    if (!listName.trim()) {
      setError('List name is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const updateData: Partial<BaseList> = {
        list_name: listName.trim(),
        list_color: listColor,
        list_icon: listIcon,
      };

      await onSave(updateData);
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to update list');
    } finally {
      setIsSaving(false);
    }
  };

  const renderColorItem = ({ item: color }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.colorItem,
        { backgroundColor: color },
        listColor === color && styles.selectedColorItem
      ]}
      onPress={() => setListColor(color)}
    >
      {listColor === color && (
        <Ionicons name="checkmark" size={16} color="#fff" />
      )}
    </TouchableOpacity>
  );

  const renderEmojiItem = ({ item: emoji }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.emojiItem,
        listIcon === emoji && styles.selectedEmojiItem
      ]}
      onPress={() => setListIcon(emoji)}
    >
      <Text style={styles.emojiText}>{emoji}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <KeyboardAvoidingView
              style={styles.container}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View style={styles.modalContent}>
                {/* Header */}
                <View style={styles.header}>
                  <TouchableOpacity onPress={onClose}>
                    <Text style={styles.cancelButton}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.title}>Edit List</Text>
                  <TouchableOpacity onPress={handleSave} disabled={isSaving}>
                    <Text style={[styles.saveButton, isSaving && styles.disabledButton]}>
                      {isSaving ? 'Saving...' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Scrollable Content */}
                <ScrollView 
                  style={styles.scrollContent}
                  contentContainerStyle={styles.scrollContentContainer}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Error message */}
                  {error && (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  {/* List Name Input */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>List Name</Text>
                    <TextInput
                      style={styles.nameInput}
                      value={listName}
                      onChangeText={setListName}
                      placeholder="Enter list name"
                      placeholderTextColor="#999"
                      maxLength={50}
                    />
                  </View>

                  {/* Color Selection */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Color</Text>
                    <FlatList
                      data={vibrantColors}
                      renderItem={renderColorItem}
                      keyExtractor={(item) => item}
                      numColumns={8}
                      style={styles.colorGrid}
                      scrollEnabled={false}
                    />
                  </View>

                  {/* Icon Selection */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Icon</Text>
                    <FlatList
                      data={availableEmojis}
                      renderItem={renderEmojiItem}
                      keyExtractor={(item) => item}
                      numColumns={8}
                      style={styles.emojiGrid}
                      scrollEnabled={false}
                    />
                  </View>

                  {/* Preview */}
                  <View style={styles.previewSection}>
                    <Text style={styles.sectionTitle}>Preview</Text>
                    <View style={[styles.previewItem, { borderLeftColor: listColor }]}>
                      <Text style={styles.previewIcon}>{listIcon}</Text>
                      <Text style={styles.previewName}>
                        {listName || 'List Name'}
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                {isSaving && (
                  <View style={styles.savingOverlay}>
                    <ActivityIndicator size="large" color="#5D87FF" />
                  </View>
                )}
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85,
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
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
  saveButton: {
    fontSize: 16,
    color: '#5D87FF',
    fontWeight: '600',
  },
  disabledButton: {
    color: '#ccc',
  },
  errorContainer: {
    margin: 20,
    padding: 12,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7d7',
  },
  errorText: {
    color: '#e53e3e',
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  colorGrid: {
    flexGrow: 0,
  },
  colorItem: {
    width: 32,
    height: 32,
    borderRadius: 16,
    margin: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColorItem: {
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  emojiGrid: {
    flexGrow: 0,
  },
  emojiItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  selectedEmojiItem: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#5D87FF',
  },
  emojiText: {
    fontSize: 20,
  },
  previewSection: {
    margin: 20,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 5,
  },
  previewIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
});

export default EditListModal;