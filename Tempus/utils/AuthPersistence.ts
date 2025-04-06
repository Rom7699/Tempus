import AsyncStorage from '@react-native-async-storage/async-storage';

// Key constants
const AUTH_USER_KEY = 'auth_user_key';
const AUTH_SESSION_KEY = 'auth_session_key';

interface StoredUser {
  username: string;
  // Add other fields you need to store
}

export const AuthPersistence = {
  // Save user data after successful login
  saveUser: async (username: string): Promise<void> => {
    try {
      const userData: StoredUser = {
        username
      };
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));
      console.log('User data saved:', userData);
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  },

  // Get stored user data
  getUser: async (): Promise<StoredUser | null> => {
    try {
      const userData = await AsyncStorage.getItem(AUTH_USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error retrieving user data:', error);
      return null;
    }
  },

  // Clear stored user data on logout
  clearUser: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      await AsyncStorage.removeItem(AUTH_SESSION_KEY);
      
      // Also clear Cognito-related items
      const keys = await AsyncStorage.getAllKeys();
      const cognitoKeys = keys.filter(
        key => key.includes('CognitoIdentityServiceProvider')
      );
      
      if (cognitoKeys.length > 0) {
        await AsyncStorage.multiRemove(cognitoKeys);
      }
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  },

  // Store additional session information if needed
  saveSessionInfo: async (sessionInfo: any): Promise<void> => {
    try {
      await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionInfo));
    } catch (error) {
      console.error('Error saving session info:', error);
    }
  },

  // Get stored session information
  getSessionInfo: async (): Promise<any | null> => {
    try {
      const sessionInfo = await AsyncStorage.getItem(AUTH_SESSION_KEY);
      return sessionInfo ? JSON.parse(sessionInfo) : null;
    } catch (error) {
      console.error('Error retrieving session info:', error);
      return null;
    }
  }
};