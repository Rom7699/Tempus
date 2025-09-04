import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import AppleHealthKit, {
  HealthKitPermissions,
  HealthValue,
} from "react-native-health";

const permissions: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.HeartRate,
    ],
    write: [],
  },
};

export default function SettingsScreen() {
  useEffect(() => {
    if (Platform.OS === "ios") {
      AppleHealthKit.initHealthKit(permissions, (err) => {
        if (err) {
          console.error("Error initializing HealthKit:", err);
          return;
        }
        console.log("HealthKit initialized successfully");
      });
    }
  }, []);

  const { user, signOut } = useAuth();
  const [userAttributes, setUserAttributes] = useState<{
    [key: string]: string;
  }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sleepData, setSleepData] = useState<any[]>([]);

  const fetchSleepData = async () => {
    console.log("🔄 Starting to fetch sleep data...");

    if (Platform.OS !== "ios") {
      console.log("❌ Not iOS, skipping HealthKit");
      return;
    }

    const options = {
      startDate: new Date(2024, 0, 0).toISOString(),
      endDate: new Date().toISOString(),
      limit: 10,
      ascending: true,
    };

    console.log("📋 Options:", options);

    AppleHealthKit.getSleepSamples(
      options,
      (err: Object, results: Array<HealthValue>) => {
        console.log("📞 Callback called!");

        if (err) {
          console.error("❌ Error fetching sleep data:", err);
          return;
        }

        console.log("✅ Successfully fetched sleep data!");
        console.log("📊 Number of records:", results?.length || 0);
        console.log("🛏️ Full sleep data:", results);

        if (results && results.length > 0) {
          console.log("🔍 First record:", results[0]);
        } else {
          console.log("⚠️ No sleep records found in Health app");
        }

        setSleepData(results || []);
      }
    );
  };

  const fetchUserAttributes = async () => {
    if (!user) return;

    return new Promise<void>((resolve) => {
      user.getUserAttributes((err, attributes) => {
        if (err) {
          console.error("Error fetching user attributes:", err);
          resolve();
          return;
        }

        if (attributes) {
          const attributesObj: { [key: string]: string } = {};
          attributes.forEach((attr) => {
            attributesObj[attr.getName()] = attr.getValue();
          });
          setUserAttributes(attributesObj);
        }
        resolve();
      });
    });
  };

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      await fetchUserAttributes();
      if (Platform.OS === "ios") {
        await fetchSleepData(); // ← Add this line!
      }
      setLoading(false);
    };
    loadUserData();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchUserAttributes(), fetchSleepData()]);
    setRefreshing(false);
  };

  const handleSignOut = () => {
    signOut();
    // Navigation will be handled by auth context
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Welcome, {userAttributes.name || "User"}!
          </Text>
          <Text style={styles.subtitle}>
            You are now signed in to your account
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Profile</Text>
          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Name</Text>
            <Text style={styles.profileValue}>
              {userAttributes.name || "Not available"}
            </Text>
          </View>
          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Email</Text>
            <Text style={styles.profileValue}>
              {userAttributes.email || "Not available"}
            </Text>
          </View>
          {userAttributes.phone_number && (
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Phone</Text>
              <Text style={styles.profileValue}>
                {userAttributes.phone_number}
              </Text>
            </View>
          )}
        </View>

        {sleepData.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Sleep Data</Text>
            {sleepData.slice(0, 5).map((sleep, index) => (
              <View key={sleep.id || index} style={styles.profileItem}>
                <Text style={styles.profileLabel}>{sleep.value}</Text>
                <Text style={styles.profileValue}>
                  {new Date(sleep.startDate).toLocaleDateString()} -{" "}
                  {new Date(sleep.endDate).toLocaleTimeString()}
                </Text>
              </View>
            ))}
            <Text style={styles.subtitle}>
              Showing {Math.min(5, sleepData.length)} of {sleepData.length}{" "}
              records
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={handleSignOut}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f4fe",
  },
  container: {
    flex: 1,
    backgroundColor: "#f1f4fe",
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginTop: 20,
    marginBottom: 30,
    alignItems: "center",
  },
  greeting: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: "#212529",
  },
  subtitle: {
    fontSize: 16,
    color: "#6c757d",
    marginTop: 5,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 15,
    color: "#212529",
  },
  profileItem: {
    flexDirection: "row",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  profileLabel: {
    width: "30%",
    fontSize: 16,
    color: "#6c757d",
  },
  profileValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#212529",
  },
  button: {
    backgroundColor: "#dc3545",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
