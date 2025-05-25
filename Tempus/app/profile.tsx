import React, { useState } from "react";
import { View, Button, Text, StyleSheet, ScrollView } from "react-native";
import * as DocumentPicker from "expo-document-picker";

export default function ProfileScreen() {
  const [selectedFiles, setSelectedFiles] = useState<
    DocumentPicker.DocumentPickerAsset[]
  >([]);
  const pickFiles = async () => {
    try {
      console.log("Attempting to pick files...");
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: true,
        copyToCacheDirectory: true,
      });

      console.log("Document picker result:", result);

      if (!result.canceled) {
        setSelectedFiles(result.assets);
        console.log("Selected files:", result.assets);
      } else {
        console.log("Document picking canceled");
      }
    } catch (error) {
      console.error("Error picking files:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text>Welcome to your profile page</Text>

      <Button title="Pick Files" onPress={pickFiles} />

      <Text style={styles.subtitle}>
        {selectedFiles.length === 0
          ? "No files selected. Tap 'Pick Files' to choose files."
          : `Selected files (${selectedFiles.length})`}
      </Text>

      <ScrollView style={styles.fileList}>{/* Existing code */}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#ffffff', // Make sure background is visible
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 20,
    marginBottom: 10,
    color: '#666',
  },
  fileList: {
    flex: 1,
    marginTop: 10,
  },
  // Other styles remain the same
});