import React from "react";
import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title || route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          let iconName = "help-circle-outline";
          
          // Map route names to icons
          if (route.name === "Calendar") {
            iconName = "calendar-outline";
          } else if (route.name === "Lists") {
            iconName = "list-outline";
          } else if (route.name === "Goals") {
            iconName = "flag-outline";
          } else if (route.name === "AITaskGeneratorScreen") {
            iconName = "sparkles-outline";
          } else if (route.name === "Settings") {
            iconName = "settings-outline";
          } else if (route.name === "HealthData") {
            iconName = "heart-outline";
          }

          return (
            <TouchableOpacity
              key={index}
              activeOpacity={0.7}
              style={[
                styles.tabItem,
              ]}
              onPress={onPress}
            >
              <View style={styles.iconContainer}>
                {route.name === "Calendar" && isFocused ? (
                  <View style={styles.calendarIconWrapper}>
                    <Text style={styles.calendarText}>{new Date().getDate()}</Text>
                  </View>
                ) : (
                  <Ionicons
                    name={iconName as any}
                    size={30}
                    color={isFocused ? "#5271FF" : "#AEAEAE"}
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f2f4ff",
  },
  tabBar: {
    flexDirection: "row",
    height: 70,
    justifyContent: "space-around",
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  calendarIconWrapper: {
    width: 40,
    height: 40,
    backgroundColor: "#5271FF",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 18,
  },
});