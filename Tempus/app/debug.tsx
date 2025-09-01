import React, { useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { setMyRealTokens } from '../services/setMyTokens';


export default function DebugScreen() {
  const [isSettingTokens, setIsSettingTokens] = useState(false);

  const handleSetRealTokens = async () => {
    setIsSettingTokens(true);
    try {
      const success = await setMyRealTokens();
      if (success) {
        Alert.alert('Success', 'Authentication tokens set successfully! You are now authenticated as Tomer Cohen.', [
          {
            text: 'Go to Calendar',
            onPress: () => router.replace('/(tabs)/Calendar')
          },
          { text: 'OK' }
        ]);
      } else {
        Alert.alert('Error', 'Failed to set authentication tokens');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to set tokens: ${error}`);
    } finally {
      setIsSettingTokens(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Debug Menu' }} />
      
      <ScrollView>
        <Text style={styles.header}>Development Auth</Text>
        <View style={styles.buttonContainer}>
          <Button 
            title={isSettingTokens ? "Setting tokens..." : "🔑 Set Real Auth Tokens"} 
            onPress={handleSetRealTokens}
            disabled={isSettingTokens}
            color="#28a745"
          />
        </View>
        <Text style={styles.subtext}>
          Bypasses login with hardcoded tokens for Tomer Cohen
        </Text>

        <Text style={styles.header}>Auth Screens</Text>
        <View style={styles.buttonContainer}>
          <Button title="Sign In" onPress={() => router.push('/(auth)/sign-in')} />
        </View>
        <View style={styles.buttonContainer}>
          <Button title="Sign Up" onPress={() => router.push('/(auth)/sign-up')} />
        </View>
        <View style={styles.buttonContainer}>
          <Button title="Forgot Password" onPress={() => router.push('/(auth)/forgot-password')} />
        </View>

        <Text style={styles.header}>Protected Screens</Text>
        <View style={styles.buttonContainer}>
          <Button title="Home" onPress={() => router.push('/(tabs)/home')} />
        </View>
        <View style={styles.buttonContainer}>
          <Button title="Calendar" onPress={() => router.push('/(tabs)/Calendar')} />
        </View>
        <View style={styles.buttonContainer}>
          <Button title="CalendarList" onPress={() => router.push('/(tabs)/CalendarListView')} />
        </View>
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
  buttonContainer: {
    marginBottom: 8,
  },
  subtext: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
  },
});