import { Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useEffect } from 'react';
import { router } from 'expo-router';

export default function ProtectedLayout() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/sign-in');
    }
  }, [user, loading]);

  if (loading || !user) {
    return null; // Or a loading component
  }

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