// import { Text, View } from "react-native";

// export default function Index() {
//   return (
//     <View
//       style={{
//         flex: 1,
//         justifyContent: "center",
//         alignItems: "center",
//       }}
//     >
//       <Text>Edit app/index.tsx to edit this screen. Heloo</Text>
//     </View>
//   );
// }


import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert, ScrollView, StyleSheet } from "react-native";
import axios from "axios";

export default function Index() {
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [date, setDate] = useState(""); // Format: YYYY-MM-DD
  const [time, setTime] = useState(""); // Format: HH:MM-HH:MM
  const [status, setStatus] = useState("pending");
  const [priority, setPriority] = useState("1");
  const [dueDate, setDueDate] = useState(""); // Optional

  const handleSubmit = async () => {
    if (!taskName || !taskDescription || !date || !time || !status || !priority) {
      Alert.alert("Please fill in all required fields");
      return;
    }

    try {
      const response = await axios.post("http://192.168.1.187:8081/tasks", {
        taskName,
        taskDescription,
        date,
        time,
        status,
        priority: parseInt(priority),
        dueDate: dueDate || undefined,
      });

      Alert.alert("Success", "Task created successfully!");
      // Clear form
      setTaskName("");
      setTaskDescription("");
      setDate("");
      setTime("");
      setStatus("pending");
      setPriority("1");
      setDueDate("");
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Task Name</Text>
      <TextInput style={styles.input} value={taskName} onChangeText={setTaskName} />

      <Text style={styles.label}>Description</Text>
      <TextInput style={styles.input} value={taskDescription} onChangeText={setTaskDescription} />

      <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate} />

      <Text style={styles.label}>Time (e.g., 14:00-16:00)</Text>
      <TextInput style={styles.input} value={time} onChangeText={setTime} />

      <Text style={styles.label}>Status</Text>
      <TextInput style={styles.input} value={status} onChangeText={setStatus} />

      <Text style={styles.label}>Priority (1–3)</Text>
      <TextInput style={styles.input} value={priority} onChangeText={setPriority} keyboardType="numeric" />

      <Text style={styles.label}>Due Date (optional)</Text>
      <TextInput style={styles.input} value={dueDate} onChangeText={setDueDate} />

      <Button title="Add Task" onPress={handleSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    fontWeight: "bold",
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginTop: 4,
  },
});
