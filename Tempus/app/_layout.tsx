import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { useColorScheme } from "react-native";
import { ThemeProvider } from "@react-navigation/native";
import { lightTheme, darkTheme } from "../constants/Theme";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? darkTheme : lightTheme}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="debug" />
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}
