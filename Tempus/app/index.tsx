import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { AuthService } from '../services/AuthService';

export default function Index() {
  const { user, loading } = useAuth();
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        console.log('Current user:', currentUser);
        setIsAuthenticated(!!currentUser);
      } catch (error) {
        console.log('Error checking authentication:', error);
        setIsAuthenticated(false);
      } finally {
        setInitialCheckComplete(true);
      }
    };

    if (!loading) {
      // If the auth context has already loaded, we can use its state
      setIsAuthenticated(!!user);
      setInitialCheckComplete(true);
    } else {
      // Otherwise check authentication ourselves
      checkAuthentication();
    }
  }, [user, loading]);

  // Show a loading spinner while we determine authentication status
  if (!initialCheckComplete) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  // Redirect based on authentication status
  return isAuthenticated ? 
    <Redirect href="/(tabs)/Calendar" /> : 
    <Redirect href="/(tabs)/Calendar" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});