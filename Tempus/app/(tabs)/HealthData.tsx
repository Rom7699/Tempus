// components/HealthDataSync.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HealthDataService } from "../../services/HealthDataService";
import { HealthUploadService } from "../../services/HealthUploadService";
import { useAuth } from "../../context/AuthContext";
import { AuthService } from "../../services/AuthService";

interface HealthDataSyncProps {
  onDataFetched?: (data: any) => void;
  onUploadComplete?: (fileUrl: string) => void;
}

const HealthDataSync: React.FC<HealthDataSyncProps> = ({
  onDataFetched,
  onUploadComplete,
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "fetching" | "uploading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [dataPreview, setDataPreview] = useState<any>(null);

  const healthDataService = HealthDataService.getInstance();

  /**
   * Handle the sync process
   */
  const handleSync = async () => {
    try {
      setIsLoading(true);
      setSyncStatus("fetching");
      setErrorMessage("");

      // Get user ID from Cognito user
      const userEmail = await AuthService.getUserEmail();
      const userId = userEmail || "unknown-user";

      // Fetch health data for the last 12 days
      console.log(
        `[HealthDataSync] Starting data fetching for user ${userId}...`
      );
      const { data, jsonString } =
        await healthDataService.prepareHealthDataForUpload(
          userId,
          30 // Fetch last 7 days
        );

      console.log("[HealthDataSync] Data fetched successfully");
      setDataPreview(data);

      if (onDataFetched) {
        onDataFetched(data);
      }

      setSyncStatus("uploading");

      // Upload to S3 via Lambda
      const uploadResult = await HealthUploadService.uploadWithRetry(
        userId,
        data,
        3 // max retries
      );

      console.log("[HealthDataSync] Upload successful:", uploadResult);

      setSyncStatus("success");
      setLastSyncTime(new Date());

      Alert.alert(
        "Success",
        `Health data has been successfully synced!\n\nFiles uploaded:\n• ${uploadResult.files.raw}\n• ${uploadResult.files.latest}`,
        [{ text: "OK" }]
      );

      if (onUploadComplete) {
        onUploadComplete(
          `s3://${uploadResult.bucket}/${uploadResult.files.latest}`
        );
      }
    } catch (error: any) {
      console.error("[HealthDataSync] Sync error:", error);
      setSyncStatus("error");
      setErrorMessage(error.message || "Failed to sync health data");

      Alert.alert(
        "Sync Failed",
        error.message || "Failed to sync health data. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Format date for display
   */
  const formatLastSyncTime = (): string => {
    if (!lastSyncTime) return "Never";

    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    return "Just now";
  };

  /**
   * Get status icon
   */
  const getStatusIcon = () => {
    switch (syncStatus) {
      case "fetching":
      case "uploading":
        return <ActivityIndicator size="small" color="#5D87FF" />;
      case "success":
        return <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />;
      case "error":
        return <Ionicons name="alert-circle" size={24} color="#FF5252" />;
      default:
        return <Ionicons name="sync-outline" size={24} color="#5D87FF" />;
    }
  };

  /**
   * Get status message
   */
  const getStatusMessage = () => {
    switch (syncStatus) {
      case "fetching":
        return "Fetching health data...";
      case "uploading":
        return "Uploading to cloud...";
      case "success":
        return "Sync completed successfully";
      case "error":
        return errorMessage || "Sync failed";
      default:
        return "Ready to sync";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="heart" size={48} color="#5D87FF" />
          <Text style={styles.title}>Health Data Sync</Text>
          <Text style={styles.subtitle}>
            Sync your Apple Health data to optimize your schedule
          </Text>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            {getStatusIcon()}
            <Text style={styles.statusText}>{getStatusMessage()}</Text>
          </View>

          <View style={styles.lastSyncContainer}>
            <Text style={styles.lastSyncLabel}>Last sync:</Text>
            <Text style={styles.lastSyncTime}>{formatLastSyncTime()}</Text>
          </View>
        </View>

        {/* Sync Button */}
        <TouchableOpacity
          style={[styles.syncButton, isLoading && styles.syncButtonDisabled]}
          onPress={handleSync}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="sync" size={20} color="#fff" />
              <Text style={styles.syncButtonText}>Sync Now</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Data Preview (for debugging) */}
        {dataPreview && (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Data Summary</Text>
            <View style={styles.previewContent}>
              <Text style={styles.previewText}>
                Days collected: {Object.keys(dataPreview.dailyData).length}
              </Text>
              <Text style={styles.previewText}>
                Date range: {dataPreview.metadata.dataRange.startDate} to{" "}
                {dataPreview.metadata.dataRange.endDate}
              </Text>
              {Object.entries(dataPreview.dailyData)
                .slice(0, 1)
                .map(([date, data]: [string, any]) => (
                  <View key={date} style={styles.daySummary}>
                    <Text style={styles.previewDate}>{date}:</Text>
                    <Text style={styles.previewText}>
                      • Sleep samples: {data.sleep.length}
                    </Text>
                    <Text style={styles.previewText}>
                      • Heart rate samples: {data.heartRate.length}
                    </Text>
                    <Text style={styles.previewText}>
                      • Steps: {data.steps.total.toLocaleString()}
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Information Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.infoText}>
            Your health data will be used to optimize your task scheduling based
            on your energy levels and activity patterns.
          </Text>
        </View>

        {/* Privacy Note */}
        <View style={styles.privacyNote}>
          <Ionicons name="lock-closed-outline" size={16} color="#999" />
          <Text style={styles.privacyNote}>
            Your data is encrypted and stored securely
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginTop: 16,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  statusCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statusText: {
    fontSize: 16,
    marginLeft: 12,
    color: "#333",
    flex: 1,
  },
  lastSyncContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  lastSyncLabel: {
    fontSize: 14,
    color: "#666",
  },
  lastSyncTime: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  syncButton: {
    backgroundColor: "#5D87FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#5D87FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  syncButtonDisabled: {
    opacity: 0.7,
  },
  syncButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  previewCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  previewContent: {
    gap: 8,
  },
  previewText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  previewDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginTop: 8,
    marginBottom: 4,
  },
  daySummary: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  infoCard: {
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: "#1976D2",
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  privacyNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
});

export default HealthDataSync;
