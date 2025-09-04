import AsyncStorage from '@react-native-async-storage/async-storage';
import { COGNITO_CLIENT_ID } from '../config/cognito';

/**
 * AsyncStorage wrapper for Amazon Cognito
 * 
 * Amazon Cognito needs a synchronous storage object, but React Native's
 * AsyncStorage is asynchronous. This wrapper maintains a local cache
 * to provide synchronous-like behavior while persisting to AsyncStorage.
 */
export class CognitoStorage {
  // In-memory cache of keys/values
  private static dataMemory: { [key: string]: string } = {};
  
  // Flag to indicate if data has been loaded from AsyncStorage
  private static dataMemoryLoaded = false;
  
  // Synchronously get an item from storage
  static getItem(key: string): string | null {
    if (CognitoStorage.dataMemoryLoaded) {
      return CognitoStorage.dataMemory[key] || null;
    }
    
    // This is a fallback for when the memory cache isn't loaded yet
    // It's not ideal but necessary for the synchronous interface
    console.warn('CognitoStorage: Memory not loaded yet, returning null');
    return null;
  }
  
  // Synchronously set an item in storage
  static setItem(key: string, value: string): void {
    CognitoStorage.dataMemory[key] = value;
    
    // Also persist to AsyncStorage (no need to await)
    AsyncStorage.setItem(key, value).catch(err => {
      console.error('Error saving to AsyncStorage:', err);
    });
  }
  
  // Synchronously remove an item from storage
  static removeItem(key: string): void {
    delete CognitoStorage.dataMemory[key];
    
    // Also remove from AsyncStorage (no need to await)
    AsyncStorage.removeItem(key).catch(err => {
      console.error('Error removing from AsyncStorage:', err);
    });
  }
  
  // Synchronously clear storage
  static clear(): void {
    CognitoStorage.dataMemory = {};
    
    // Get all Cognito-related keys and remove them
    AsyncStorage.getAllKeys()
      .then(keys => {
        const cognitoKeys = keys.filter(k => k.includes('CognitoIdentityServiceProvider'));
        if (cognitoKeys.length > 0) {
          return AsyncStorage.multiRemove(cognitoKeys);
        }
      })
      .catch(err => {
        console.error('Error clearing AsyncStorage:', err);
      });
  }
  
  // Load all Cognito keys from AsyncStorage to memory
  // Call this when the app starts, before any auth operations
  static async loadDataToMemory(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cognitoKeys = keys.filter(k => k.includes('CognitoIdentityServiceProvider'));
      
      if (cognitoKeys.length > 0) {
        const keyValuePairs = await AsyncStorage.multiGet(cognitoKeys);
        keyValuePairs.forEach(([key, value]) => {
          if (value) {
            CognitoStorage.dataMemory[key] = value;
          }
        });
        
        console.log('CognitoStorage: Loaded data from AsyncStorage -', cognitoKeys.length, 'items');
        
        // Debug information
        const lastUsername = CognitoStorage.dataMemory[`CognitoIdentityServiceProvider.${COGNITO_CLIENT_ID}.LastAuthUser`];
        if (lastUsername) {
          const idTokenKey = `CognitoIdentityServiceProvider.${COGNITO_CLIENT_ID}.${lastUsername}.idToken`;
          const hasIdToken = !!CognitoStorage.dataMemory[idTokenKey];
          console.log('CognitoStorage: Has LastAuthUser:', !!lastUsername);
          console.log('CognitoStorage: Has idToken:', hasIdToken);
        } else {
          console.log('CognitoStorage: No LastAuthUser found');
        }
      } else {
        console.log('CognitoStorage: No Cognito keys found in AsyncStorage');
      }
      
      CognitoStorage.dataMemoryLoaded = true;
    } catch (error) {
      console.error('Error loading data from AsyncStorage:', error);
      // Still mark as loaded to prevent endless retries
      CognitoStorage.dataMemoryLoaded = true;
    }
  }
  
  // Check if data is loaded from AsyncStorage
  static isLoaded(): boolean {
    return CognitoStorage.dataMemoryLoaded;
  }
}