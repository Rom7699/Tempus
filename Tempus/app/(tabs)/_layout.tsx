import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Text } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 60,
          backgroundColor: "white",
          borderTopWidth: 1,
          borderTopColor: "#f0f0f0",
          elevation: 0, // Remove shadow on Android
          shadowOpacity: 0, // Remove shadow on iOS
        },
        tabBarItemStyle: {
          // Each tab item styling
          paddingVertical: 5,
        },
        tabBarActiveTintColor: "#FFFFFF", // White text/icon for active tab
        tabBarInactiveTintColor: "#CCCCCC", // Gray for inactive tabs
        // Custom tab appearance
        tabBarLabel: ({ focused, color }) => {
          return null; // No labels, just icons
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color, size }) => (
            <View
              style={{
                backgroundColor: focused ? "#5D87FF" : "transparent",
                width: focused ? 40 : 'auto',
                height: focused ? 40 : 'auto',
                borderRadius: 20,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons 
                name="checkmark" 
                size={24} 
                color={focused ? "#FFFFFF" : "#CCCCCC"} 
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="Calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ focused, color, size }) => (
            <View
              style={{
                backgroundColor: focused ? "#5D87FF" : "transparent",
                width: focused ? 40 : 'auto',
                height: focused ? 40 : 'auto',
                borderRadius: 20,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {focused ? (
                <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>
                  7
                </Text>
              ) : (
                <Ionicons name="calendar" size={24} color="#CCCCCC" />
              )}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused, color, size }) => (
            <View
              style={{
                backgroundColor: focused ? "#5D87FF" : "transparent",
                width: focused ? 40 : 'auto',
                height: focused ? 40 : 'auto',
                borderRadius: 20,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons 
                name="ellipsis-horizontal" 
                size={24} 
                color={focused ? "#FFFFFF" : "#CCCCCC"} 
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}