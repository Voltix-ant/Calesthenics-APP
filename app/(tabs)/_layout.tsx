import { Tabs } from "expo-router/js-tabs";

import { TabBar } from "@/components/tab-bar";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Workouts" }} />
      <Tabs.Screen name="timer" options={{ title: "Chrono" }} />
    </Tabs>
  );
}
