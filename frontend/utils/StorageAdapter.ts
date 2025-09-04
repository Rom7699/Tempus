import AsyncStorage from '@react-native-async-storage/async-storage';

// Create a storage adapter that implements the synchronous interface expected by Cognito
export class StorageAdapter {
  // Synchronous method stubs that return empty values
  static getItem(key: string): string | null {
    return null;
  }

  static setItem(key: string, value: string): void {
    try {
      AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  }

  static removeItem(key: string): void {
    try {
      AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from storage:', error);
    }
  }

  static clear(): void {
    try {
      // Only clear Cognito-related keys to avoid affecting other app data
      AsyncStorage.getAllKeys().then(keys => {
        const cognitoKeys = keys.filter(key => key.includes('CognitoIdentityServiceProvider'));
        if (cognitoKeys.length > 0) {
          AsyncStorage.multiRemove(cognitoKeys);
        }
      });
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }
}