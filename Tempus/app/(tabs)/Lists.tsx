import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Modal,
    TextInput,
    Alert,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { addList, getLists, addTask, getTasksByListId, deleteTask, getTasksByMonth, getTasksByYear, updateTask } from '@/context/ApiContext';
import { BaseList, List } from '@/types/lists';
import { BaseTask, Task, UpdateTaskInput } from '@/types/tasks';
import AddTaskModal from '@/components/AddTaskModal'; // Assuming you have this component
import AddListModal from '@/components/AddListModal';
import DisplayTaskModal from '@/components/DisplayTaskModal'; // Assuming you have this component
import { Ionicons } from '@expo/vector-icons';


const HeadersTasksPage: React.FC = () => {
    const [lists, setLists] = useState<List[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedList, setSelectedList] = useState<List | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isAddListModalVisible, setIsAddListModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isTasksLoading, setIsTasksLoading] = useState(false);
    const [isAddTaskModalVisible, setIsAddTaskModalVisible] = useState(false);
    const [isDisplayTaskModalVisible, setIsDisplayTaskModalVisible] = useState(false);
    const [editTask, setEditTask] = useState<Task | null>(null);



    useEffect(() => {
        fetchLists();
    }, []);

    const handleTaskPress = (task: Task) => {
        setSelectedTask(task);
        setIsDisplayTaskModalVisible(true);
    };

    const handleEditRequest = (task: Task) => {
        setSelectedTask(null); // Clear selected task for edit
        setEditTask(task); // Set the task to be edited
        setIsAddTaskModalVisible(true);
    };


    // Handle actions from the modal
    const handleEditTask = async (updatedTask: Task) => {
        try {
            await updateTask(updatedTask);

            // Update the tasks in the state
            setTasks(currentTasks =>
                currentTasks.map(t =>
                    t.task_id === updatedTask.task_id ? updatedTask : t
                )
            );

            setIsAddTaskModalVisible(false);
            setEditTask(null); // Clear the edit task state
            Alert.alert("Success", "Task updated successfully");
        } catch (error) {
            console.error("Error updating task:", error);
            Alert.alert("Error", "Failed to update task");
        }
    };

    // Handle save from AddTaskModal (both add and edit cases)
    const handleTaskSave = async (taskData: BaseTask | UpdateTaskInput) => {
        try {
            // If we have a task to edit (has a task_id), it's an edit operation
            if (editTask && 'task_id' in taskData) {
                handleEditTask(taskData as UpdateTaskInput);
            } else {
                handleAddTask(taskData as BaseTask);
            }

            // Close the modal
            setIsAddTaskModalVisible(false);
            setEditTask(null);

            // If needed, refresh the list or update UI
            if (selectedList) {
                fetchTasksForList(selectedList.list_id);
            }
        } catch (error) {
            console.error("Error saving task:", error);
            Alert.alert("Error", "Failed to save task");
        }
    };

    // Handle delete task action
    const handleDeleteTask = async (taskId: string) => {
        try {
            await deleteTask(taskId);

            // Refresh task list
            if (selectedList) {
                fetchTasksForList(selectedList.list_id);
            }

            Alert.alert("Success", "Task deleted successfully");
        } catch (error) {
            console.error("Error deleting task:", error);
            Alert.alert("Error", "Failed to delete task");
        }
    };

    // Handle toggle complete action
    const handleToggle = async (task: Task, isCompleted: boolean) => {
        // Store original task for potential rollback
        const originalTask = { ...task };

        // Optimistically update UI
        setTasks(currentTasks =>
            currentTasks.map(t =>
                t.task_id === task.task_id
                    ? { ...t, is_completed: isCompleted }
                    : t
            )
        );

        try {
            // Create updated task
            const updatedTask: UpdateTaskInput = {
                ...task,
                is_completed: isCompleted,
            };

            // Call API
            await updateTask(updatedTask);
            // Success - nothing more to do as UI is already updated

        } catch (error) {
            console.error("Error toggling task completion:", error);

            // Revert to original state on error
            setTasks(currentTasks =>
                currentTasks.map(t =>
                    t.task_id === task.task_id
                        ? originalTask
                        : t
                )
            );

            Alert.alert("Error", "Failed to update task status");
        }
    };


    const fetchLists = async () => {
        setIsLoading(true);
        try {
            const lists = await getLists();
            setLists(lists.listsArr);
        } catch (error) {
            console.error('Error fetching lists:', error);
            Alert.alert('Error', 'Failed to load lists. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };


    const fetchTasksForList = async (listId: number) => {
        setIsTasksLoading(true);
        try {
            const tasks = await getTasksByListId(listId); // now correctly awaited
            setTasks(tasks.tasksArr); // assuming you have setTasks defined
        } catch (error) {
            console.error('Error fetching tasks:', error);
            Alert.alert('Error', 'Failed to load tasks. Please try again.');
        } finally {
            setIsTasksLoading(false);
        }
    };


    const handleListPress = (list: List) => {
        setSelectedList(list);
        fetchTasksForList(list.list_id);
    };

    const handleAddList = async (newList: BaseList) => {
        try {
            const response = await addList(newList);
            if (!response) {
                throw new Error('Failed to add list');
            };

            Alert.alert('Success', 'List added successfully');
            fetchLists();
            setIsAddListModalVisible(false);
        } catch (error) {
            console.error('Error adding list:', error);
            Alert.alert('Error', 'Failed to add list. Please try again.');
        }
    };



    const renderList = ({ item }: { item: List }) => (
        <TouchableOpacity
            style={[styles.listItem, { borderLeftWidth: 5, borderLeftColor: item.list_color }]} // if we want to change the color of the border
            onPress={() => handleListPress(item)}
        >
            <Text style={styles.emojiIcon}>{item.list_icon}</Text>
            <Text style={styles.listTitle}>{item.list_name}</Text>
            <Icon name="chevron-right" size={24} color="#888" />
        </TouchableOpacity>
    );


    const renderTask = ({ item }: { item: Task }) => {
        // Check if we have priority - we can use it for visual indicators
        const hasPriority = item.task_priority !== undefined;
        const priorityColor = hasPriority ? getPriorityColor(item.task_priority!) : '#888';

        return (
            <TouchableOpacity
                style={styles.taskItem}
                onPress={() => handleTaskPress(item)}
            >
                <View style={[styles.taskPriorityIndicator, { backgroundColor: priorityColor }]} />
                <View style={styles.taskDetails}>
                    <View style={styles.taskTitleRow}>
                        <Text style={styles.taskTitle}>{item.task_name}</Text>
                        <View style={styles.badgesContainer}>
                            {/* Display badge based on is_event value */}
                            {item.is_event ? (
                                <View style={styles.eventBadge}>
                                    <Ionicons name="calendar" size={12} color="#5D87FF" />
                                    <Text style={styles.eventBadgeText}>Event</Text>
                                </View>
                            ) : (
                                <View style={styles.taskBadge}>
                                    <Ionicons name="checkbox-outline" size={12} color="#4CAF50" />
                                    <Text style={styles.taskBadgeText}>Task</Text>
                                </View>
                            )}

                            {/* AI badge for AI-generated tasks */}
                            {item.is_ai_generated && (
                                <View style={styles.aiBadge}>
                                    <Ionicons name="flash" size={12} color="#9C27B0" />
                                    <Text style={styles.aiBadgeText}>AI</Text>
                                </View>
                            )}
                        </View>
                    </View>


                    {/* Nice date/time display */}
                    {item.task_start_date && (
                        <View style={styles.dateTimeContainer}>
                            <Ionicons
                                name={item.task_end_time ? "time-outline" : "calendar-outline"}
                                size={14}
                                color="#888"
                                style={styles.dateTimeIcon}
                            />
                            <Text style={styles.dateTimeText}>
                                {formatNiceDateTime(item.task_start_date, item.task_start_time)}
                            </Text>
                        </View>
                    )}
                </View>
                <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#CCCCCC"
                />
            </TouchableOpacity>
        );
    };

    // Helper function to get color based on priority
    const getPriorityColor = (priority: number): string => {
        switch (priority) {
            case 1: return '#EA4335'; // High
            case 2: return '#FBBC05'; // Medium
            case 3: return '#34A853'; // Low
            default: return '#888';
        }
    };

    const formatNiceDateTime = (dateStr?: string, timeStr?: string) => {
        if (!dateStr) return '';

        try {
            // Parse the date
            const date = new Date(dateStr);

            // Get today and tomorrow for comparison
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Get day of week
            const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });

            // Get month and day
            const monthDay = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });

            // Format time if provided
            let timeDisplay = '';
            if (timeStr) {
                const [hours, minutes] = timeStr.split(':');
                const formattedTime = new Date().setHours(parseInt(hours), parseInt(minutes));
                timeDisplay = new Date(formattedTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: false
                });
            }

            // Check if date is today or tomorrow
            const dateDisplay = (() => {
                if (date.toDateString() === today.toDateString()) {
                    return 'Today';
                } else if (date.toDateString() === tomorrow.toDateString()) {
                    return 'Tomorrow';
                } else {
                    return `${dayOfWeek}, ${monthDay}`;
                }
            })();

            // Return formatted date and time
            return timeStr
                ? `${dateDisplay} at ${timeDisplay}`
                : dateDisplay;

        } catch (e) {
            console.error('Error formatting date:', e);
            return dateStr;
        }
    };

    const handleAddTask = async (task: BaseTask) => {
        try {
            if (!selectedList) return;
            const response = await addTask(task);
            setIsAddTaskModalVisible(false);
            //fetchTasksForList(selectedList.list_id); // Refresh task list
            setTasks(currentTasks => [...currentTasks, response.task]);
        } catch (error) {
            console.error("Error adding task:", error);
        }
    };


    return (
        <SafeAreaView style={styles.container}>
            {selectedList ? (
                <View style={styles.tasksContainer}>
                    <View style={[styles.tasksHeader, { borderBottomColor: selectedList.list_color }]}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => setSelectedList(null)}
                        >
                            <Icon name="arrow-back" size={24} color="#333" />
                        </TouchableOpacity>
                        <View style={styles.listTitleContainer}>
                        <Text style={styles.headerEmojiIcon}>{selectedList.list_icon}</Text>
                            <Text style={styles.tasksHeaderTitle}>{selectedList.list_name}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.addButton} // { backgroundColor: selectedList.list_color + '20' }
                            onPress={() => {
                                setSelectedTask(null); // Reset selected task for new task creation
                                setIsAddTaskModalVisible(true);
                            }}
                        >
                            <Icon name="add" size={24} color = "#333" // {selectedList.list_color}
                            /> 
                        </TouchableOpacity>
                    </View>

                    {isTasksLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#007AFF" />
                        </View>
                    ) : tasks.length > 0 ? (
                        <FlatList
                            data={tasks}
                            keyExtractor={(item) => item.task_id}
                            renderItem={renderTask}
                            contentContainerStyle={styles.tasksList}
                        />
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Icon name="inbox" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>No tasks yet</Text>
                            <Text style={styles.emptySubText}>Tap + to add a new task</Text>
                        </View>
                    )}
                </View>
            ) : (
                <View style={styles.listsContainer}>
                    <View style={styles.pageHeader}>
                        <Text style={styles.pageTitle}>My Lists</Text>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => setIsAddListModalVisible(true)}
                        >
                            <Icon name="add" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#007AFF" />
                        </View>
                    ) : Array.isArray(lists) && lists.length > 0 ? (
                        <FlatList
                            data={lists}
                            keyExtractor={(item) => item.list_id.toString()}
                            renderItem={renderList}
                            contentContainerStyle={styles.listsList}
                        />
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Icon name="view-list" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>No lists yet</Text>
                            <Text style={styles.emptySubText}>Tap + to add a new list</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Modal for adding new list */}
            <AddListModal
                visible={isAddListModalVisible}
                onClose={() => setIsAddListModalVisible(false)}
                onSave={handleAddList}
            />

            {/* Modal for adding new task */}
            <AddTaskModal
                visible={isAddTaskModalVisible}
                onClose={() => {
                    setIsAddTaskModalVisible(false);
                    setEditTask(null);
                }}
                onSave={handleTaskSave}
                availableLists={lists} // Pass all lists for selection
                selectedDate={new Date()} // pre-fill with current date later
                parentList={selectedList} // Pass the selected list to the task modal
                initialTask={editTask} // Pass the selected task for editing

            //onCreateNewList={handleAddList}

            />

            {/* Modal for displaying and editing task */}
            {selectedTask && (
                <DisplayTaskModal
                    visible={isDisplayTaskModalVisible}
                    onClose={() => {
                        setIsDisplayTaskModalVisible(false);
                        setSelectedTask(null);
                    }}
                    task={selectedTask}
                    onEdit={handleEditRequest}
                    onDelete={handleDeleteTask}
                    onToggle={handleToggle}
                    availableLists={lists}
                //onCreateNewList={handleCreateNewList}
                />
            )}


        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    listsContainer: {
        flex: 1,
    },
    pageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    pageTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    addButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
    },
    listsList: {
        padding: 16,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    listTitle: {
        fontSize: 16,
        marginLeft: 12,
        flex: 1,
    },
    tasksContainer: {
        flex: 1,
    },
    tasksHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 2,
    },
    taskBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(76, 175, 80, 0.15)', // Light green background for tasks
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 8,
    },
    taskBadgeText: {
        fontSize: 10,
        color: '#4CAF50', // Green text for tasks
        fontWeight: '500',
        marginLeft: 2,
    },
    backButton: {
        marginRight: 16,
    },
    listTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    tasksHeaderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 12,
    },
    tasksList: {
        padding: 16,
    },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    taskPriorityIndicator: {
        width: 4,
        height: '80%',
        borderRadius: 2,
        marginRight: 12,
    },
    taskTitle: {
        fontSize: 16,
        flex: 1,
    },
    taskDeadline: {
        fontSize: 12,
        color: '#888',
    },
    taskDetails: {
        flex: 1,
        marginLeft: 8
    },
    badgesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 'auto', // Pushes the badges to the right
    },
    aiBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(156, 39, 176, 0.15)', // Light purple background
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 4,
    },
    aiBadgeText: {
        fontSize: 10,
        color: '#9C27B0', // Purple text
        fontWeight: '500',
        marginLeft: 2,
    },
    emojiIcon: {
        fontSize: 22,
        marginRight: 10,
    },
    headerEmojiIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    taskTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4
    },
    dateTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    dateTimeIcon: {
        marginRight: 4,
    },
    dateTimeText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    eventBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 8
    },
    eventBadgeText: {
        fontSize: 10,
        color: '#5D87FF',
        marginLeft: 2,
        fontWeight: '500'
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
        color: '#888',
    },
    emptySubText: {
        fontSize: 14,
        color: '#888',
        marginTop: 8,
    },
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
    iconSelector: {
        marginBottom: 20,
    },
    iconItem: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 25,
        backgroundColor: '#f0f0f0',
        marginRight: 12,
    },
    colorSelector: {
        marginBottom: 24,
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

export default HeadersTasksPage;