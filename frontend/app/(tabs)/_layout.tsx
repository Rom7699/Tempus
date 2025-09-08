import { Tabs } from "expo-router";
import { TabBar } from "../../components/TabBar";
import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../context/ApiContext";

export default function TabLayout() {
  const { user } = useAuth();
  const api = useApi();

  // Initialize notifications when user is authenticated
  useEffect(() => {
    const initNotifications = async () => {
      if (user) {
        try {
          console.log('Initializing notifications for authenticated user');
          
          // Register for push notifications and get token
          const token = await api.registerPushNotifications();
          
          if (token) {
            console.log('Push notification token received:', token.type);
            
            // Save token to backend
            await api.savePushToken(token.token, token.type);
            console.log('Push token saved to backend');
            
            // Setup notification listeners
            api.setupNotificationListeners();
            console.log('Notification listeners setup complete');
          }
        } catch (error) {
          console.error('Failed to setup notifications:', error);
        }
      }
    };
    
    initNotifications();
  }, [user]); // Re-run if auth state changes

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen
        name="Calendar"
        options={{
          title: "Calendar",
        }}
      />

      <Tabs.Screen
        name="Lists"
        options={{
          title: "Lists",
        }}
      />

      <Tabs.Screen
        name="Goals"
        options={{
          title: "Goals",
        }}
      />

      <Tabs.Screen
        name="AITaskGeneratorScreen"
        options={{
          title: "AI",
        }}
      />

      <Tabs.Screen
        name="Settings"
        options={{
          title: "Settings",
        }}
      />
    </Tabs>
  );
}