import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import AddListModal from "./AddListModal";
import { Ionicons } from "@expo/vector-icons";
import { List, BaseList } from "@/types/lists";

const { height } = Dimensions.get("window");

interface ListSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  availableLists: List[];
  selectedList: List | null;
  onSelectList: (list: List) => void;
  onCreateNewList?: (newList: BaseList) => Promise<List>;
}

const ListSelectionModal: React.FC<ListSelectionModalProps> = ({
  visible,
  onClose,
  availableLists,
  selectedList,
  onSelectList,
  onCreateNewList = async (newList: BaseList): Promise<List> => ({
    list_id: 1,
    list_name: "Default",
    list_color: "#5D87FF",
    list_icon: "checkmark",
  }),
}) => {
  const [newListName, setNewListName] = useState("");
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const translateY = useState(new Animated.Value(height))[0];
  const backdropOpacity = useState(new Animated.Value(0))[0];
  const [showAddListModal, setShowAddListModal] = useState(false);

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
    } else {
      // Reset states when modal is hidden
      setNewListName("");
      setShowNewListInput(false);
      setShowAddListModal(false);
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

  const handleSelectList = (list: List) => {
    onSelectList(list);
    animateOut(onClose);
  };

  const handleCreateNewList = async (newList: BaseList) => {
    try {
      setIsCreating(true);
      const createdList = await onCreateNewList(newList);
      console.log("New list created:", createdList);
      // Select the newly created list
      onSelectList(createdList);

      // Close the AddListModal
      setShowAddListModal(false);

      // Optionally, you can also close the ListSelectionModal
      animateOut(onClose);
      return createdList;
    } catch (error) {
      console.error("Failed to create new list:", error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const renderListItem = ({ item }: { item: List }) => (
    <TouchableOpacity
      style={[
        styles.listItem,
        selectedList?.list_id === item.list_id && styles.selectedListItem,
      ]}
      onPress={() => handleSelectList(item)}
    >
      <View
        style={[
          styles.listColorIndicator,
          { backgroundColor: item.list_color },
        ]}
      />
      <Text style={styles.listItemText}>{item.list_name}</Text>
      {selectedList?.list_id === item.list_id && (
        <Ionicons name="checkmark" size={20} color="#5D87FF" />
      )}
    </TouchableOpacity>
  );

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
            <Text style={styles.title}>Select List</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#999" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={availableLists}
            renderItem={renderListItem}
            keyExtractor={(item) => item.list_id.toString()}
            style={styles.listContainer}
            contentContainerStyle={styles.listContent}
          />

          <TouchableOpacity
            style={styles.createNewListButton}
            onPress={() => setShowAddListModal(true)}
          >
            <Ionicons name="add-circle-outline" size={22} color="#5D87FF" />
            <Text style={styles.createNewListText}>Create New List</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
      <AddListModal
        visible={showAddListModal}
        onClose={() => setShowAddListModal(false)}
        onSave={handleCreateNewList}
      />
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
  listContainer: {
    maxHeight: height * 0.5,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  selectedListItem: {
    backgroundColor: "#f8f9fe",
  },
  listColorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 12,
  },
  listItemText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  createNewListButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  createNewListText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#5D87FF",
    fontWeight: "500",
  },
  newListInputContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  newListInput: {
    fontSize: 16,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginBottom: 12,
  },
  newListButtonsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  newListButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  cancelNewListButton: {
    fontSize: 16,
    color: "#999",
  },
  disabledButton: {
    color: "#CCCCCC",
  },
});

export default ListSelectionModal;
