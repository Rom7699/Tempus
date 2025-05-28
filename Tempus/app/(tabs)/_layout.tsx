import { Tabs } from "expo-router";
import { TabBar } from "../../components/TabBar";

export default function TabLayout() {
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
