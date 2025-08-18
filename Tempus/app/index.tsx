import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

export default function Index() {
  const { user, loading } = useAuth();

  // Show a loading spinner while we determine authentication status
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  // Redirect based on authentication status meaning if user is authenticated successfully
  return user ? 
    <Redirect href="/(tabs)/Calendar" /> : 
    <Redirect href="/(auth)/sign-in" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});