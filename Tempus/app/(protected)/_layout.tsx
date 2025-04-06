import { Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useEffect } from 'react';
import { router } from 'expo-router';

export default function ProtectedLayout() {
  const { user, loading } = useAuth();

  return (
    <Stack>
      <Stack.Screen
        name="home"
        options={{
          title: 'Dashboard',
          headerBackVisible: false,
        }}
      />
    </Stack>
  );
}