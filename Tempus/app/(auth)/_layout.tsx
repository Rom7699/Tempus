import { Stack } from 'expo-router';
import { Button } from 'react-native';  
import { router } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="sign-in"
        options={{
          headerShown: false // Or custom header options
        }}
      />
      <Stack.Screen
        name="sign-up"
        options={{
          headerLeft: () => (
            <Button
              onPress={() => router.back()} 
              title="Back"
            />
          )
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: 'Forgot Password',
        }}
      />
      <Stack.Screen
        name="reset-password"
        options={{
          title: 'Reset Password',
        }}
      />
      <Stack.Screen
        name="confirm-registration"
        options={{
          title: 'Verify Account',
        }}
      />
    </Stack>
  );
}