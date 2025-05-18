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
} from 'react-native';
import { BaseList } from '@/types/lists';

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
    '#00C9A7', '#C34A36', '#845EC2', '#D65DB1',
    '#FF6F91', '#FF9671', '#FFC75F', '#008F7A',
];

interface AddListModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (newList: BaseList) => void;
}

const AddListModal: React.FC<AddListModalProps> = ({ visible, onClose, onSave }) => {
    const [newListName, setNewListName] = useState('');
    const [newListIcon, setNewListIcon] = useState('🏠');
    const [newListColor, setNewListColor] = useState('');

    // Generate a random color when the modal opens
    useEffect(() => {
        if (visible) {
            generateRandomColor();
        }
    }, [visible]);

    // Function to generate a random color
    const generateRandomColor = () => {
        const randomIndex = Math.floor(Math.random() * vibrantColors.length);
        setNewListColor(vibrantColors[randomIndex]);
    };

    const handleSave = () => {
        if (newListName.trim() === '') {
            return;
        }

        const newList: BaseList = {
            list_name: newListName.trim(),
            list_icon: newListIcon,
            list_color: newListColor,
        };

        onSave(newList);
        resetForm();
    };

    const resetForm = () => {
        setNewListName('');
        setNewListIcon('🏠');
        // Color will be regenerated next time the modal opens
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.modalContainer}
            >
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Add New List</Text>

                    <Text style={styles.inputLabel}>List Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter list name"
                        value={newListName}
                        onChangeText={setNewListName}
                    />

                    <Text style={styles.inputLabel}>Choose Emoji</Text>
                    <View style={styles.emojiSelector}>
                        <FlatList
                            data={availableEmojis}
                            keyExtractor={(item) => item}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.emojiItem,
                                        newListIcon === item && styles.selectedEmojiItem
                                    ]}
                                    onPress={() => setNewListIcon(item)}
                                >
                                    <Text style={styles.emoji}>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>

                    <View style={styles.modalButtons}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={handleClose}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.saveButton]}
                            onPress={handleSave}
                        >
                            <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 24,
        textAlign: 'center',
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 8,
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
        marginBottom: 24,
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
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
        marginRight: 8,
    },
    saveButton: {
        backgroundColor: '#007AFF',
        marginLeft: 8,
    },
    cancelButtonText: {
        color: '#333',
        fontWeight: '500',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: '500',
    },
});

export default AddListModal;