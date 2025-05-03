import React from 'react';
import { View, Text, Button, ScrollView, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';

export default function DebugScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Debug Menu' }} />
      
      <ScrollView>
        <Text style={styles.header}>Auth Screens</Text>
        <Button title="Sign In" onPress={() => router.push('/(auth)/sign-in')} />
        <Button title="Sign Up" onPress={() => router.push('/(auth)/sign-up')} />
        <Button title="Forgot Password" onPress={() => router.push('/(auth)/forgot-password')} />
        <Text style={styles.header}>Protected Screens</Text>
        <Button title="Home" onPress={() => router.push('/(tabs)/home')} />
        <Button title="Calendar" onPress={() => router.push('/(tabs)/Calendar')} />
        <Button title="CalendarList" onPress={() => router.push('/(tabs)/CalendarListView')} />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
});