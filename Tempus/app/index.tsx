import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();
  console.log('User:', user);
  console.log('Loading:', loading);
  if (loading) {
    return null; // Or a loading component
  }

  // Redirect based on authentication status
  return user ? <Redirect href="/(protected)/home" /> : <Redirect href="/(protected)/home" />;
}