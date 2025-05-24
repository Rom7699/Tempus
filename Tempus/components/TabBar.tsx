import { View, Platform, TouchableOpacity, StyleSheet } from "react-native";
import { useLinkBuilder, useTheme } from "@react-navigation/native";
import { Text, PlatformPressable } from "@react-navigation/elements";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from '@expo/vector-icons';

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const icon = { 
        home: (props: any) => <Ionicons 
            name='home-outline'
            size={24} 
            {...props}
          />,
        Calendar: (props: any) => <Ionicons 
            name='calendar-outline'
            size={24} 
            {...props}
          />,
        Lists: (props: any) => <Ionicons 
            name="list"
            size={24} 
            {...props}
          />,
        profile: (props: any) => <Ionicons 
            name='person-outline'
            size={24} 
            {...props}
          />,
      };
  
    return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        return (
          <TouchableOpacity
            key={route.name}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel="options.tabBarAccessibilityLabel"
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabBarItem}
          >
            {icon[route.name]({ color: isFocused ? "#5D87FF" : "#222" })}
            <Text style ={{ color: isFocused ? "#5D87FF" : "#222" }}>
              {typeof label === 'string' 
                ? label 
                : typeof label === 'function' 
                  ? label({
                      focused: isFocused,
                      color: isFocused ? "#5D87FF" : "#222",
                      position: 'below-icon',
                      children: route.name
                    })
                  : route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: 25,
    flexDirection: 'row',
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 80,
    paddingVertical: 15,
    borderRadius: 35,
    shadowColor: "#000",    
    shadowOffset: {  width: 0, height: 10},
    shadowRadius: 10,
    shadowOpacity: 0.1,
  },
  tabBarItem:{
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  }
});