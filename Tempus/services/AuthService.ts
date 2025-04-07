import {
  CognitoUser,
  CognitoUserAttribute,
  AuthenticationDetails,
  ISignUpResult,
  CognitoUserPool
} from 'amazon-cognito-identity-js';
import { userPool } from '../config/cognito';
import { CognitoStorage } from '../utils/CognitoStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SignUpParams {
  fullName: string;
  email: string;
  password: string;
}

interface SignInParams {
  email: string;
  password: string;
}

export class AuthService {
  // Sign up a new user
  static signUp = (params: SignUpParams): Promise<ISignUpResult> => {
    const { fullName, email, password } = params;
    
    const attributeList = [
      new CognitoUserAttribute({
        Name: 'name',
        Value: fullName
      }),
      new CognitoUserAttribute({
        Name: 'email',
        Value: email
      })
    ];
    
    return new Promise((resolve, reject) => {
      userPool.signUp(
        email,
        password,
        attributeList,
        [],
        (err, result) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(result!);
        }
      );
    });
  };

  // Sign in an existing user
  static signIn = (params: SignInParams): Promise<CognitoUser> => {
    const { email, password } = params;
    
    const authenticationDetails = new AuthenticationDetails({
      Username: email,
      Password: password
    });
    
    const userData = {
      Username: email,
      Pool: userPool
    };
    
    const cognitoUser = new CognitoUser(userData);
    
    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: async (result) => {
          console.log('[AuthService] Login successful');
          
          // Force a sync of the tokens to storage
          try {
            // Get the client ID from the user pool
            const clientId = userPool.getClientId();
            
            // Extract tokens from the result
            const idToken = result.getIdToken().getJwtToken();
            const accessToken = result.getAccessToken().getJwtToken();
            const refreshToken = result.getRefreshToken().getToken();
            
            // Save the last authenticated user
            CognitoStorage.setItem(
              `CognitoIdentityServiceProvider.${clientId}.LastAuthUser`, 
              email
            );
            
            // Save tokens using the same keys Cognito uses
            CognitoStorage.setItem(
              `CognitoIdentityServiceProvider.${clientId}.${email}.idToken`, 
              idToken
            );
            CognitoStorage.setItem(
              `CognitoIdentityServiceProvider.${clientId}.${email}.accessToken`, 
              accessToken
            );
            CognitoStorage.setItem(
              `CognitoIdentityServiceProvider.${clientId}.${email}.refreshToken`, 
              refreshToken
            );
            
            console.log('[AuthService] Tokens saved to storage');
          } catch (error) {
            console.error('[AuthService] Error saving tokens:', error);
          }
          
          resolve(cognitoUser);
        },
        onFailure: (err) => {
          console.error('[AuthService] Login failed:', err);
          reject(err);
        },
        // Handle new password required (for admin created users)
        newPasswordRequired: (userAttributes, requiredAttributes) => {
          // This is relevant if you allow admin creation of users
          console.log('[AuthService] New password required');
          reject(new Error('New password setup required. Please contact support.'));
        }
      });
    });
  };

  // Sign out the current user and clear any cached tokens
  static signOut = async (): Promise<void> => {
    const currentUser = userPool.getCurrentUser();
    
    try {
      // Explicitly clear tokens from storage
      const clientId = userPool.getClientId();
      
      if (currentUser) {
        const username = currentUser.getUsername();
        console.log('[AuthService] Signing out user:', username);
        
        // Clear specific tokens
        try {
          CognitoStorage.removeItem(`CognitoIdentityServiceProvider.${clientId}.${username}.idToken`);
          CognitoStorage.removeItem(`CognitoIdentityServiceProvider.${clientId}.${username}.accessToken`);
          CognitoStorage.removeItem(`CognitoIdentityServiceProvider.${clientId}.${username}.refreshToken`);
          CognitoStorage.removeItem(`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`);
        } catch (error) {
          console.error('[AuthService] Error clearing specific tokens:', error);
        }
        
        // Call SDK's signOut
        currentUser.signOut();
      }
      
      // Clear all Cognito data as a fallback
      const keys = await AsyncStorage.getAllKeys();
      const cognitoKeys = keys.filter(key => key.includes('CognitoIdentityServiceProvider'));
      if (cognitoKeys.length > 0) {
        await AsyncStorage.multiRemove(cognitoKeys);
        console.log('[AuthService] Cleared all Cognito data from storage');
      }
    } catch (error) {
      console.error('[AuthService] Error during sign out:', error);
    }
    
    return Promise.resolve();
  };

  // Get current authenticated user with session validation
  static getCurrentUser = async (): Promise<CognitoUser | null> => {
    try {
      // Wait for storage to be loaded
      if (!CognitoStorage.isLoaded()) {
        console.log('[AuthService] Storage not loaded, loading now...');
        try {
          await CognitoStorage.loadDataToMemory();
          console.log('[AuthService] Storage loaded successfully');
        } catch (error) {
          console.log('[AuthService] Failed to load storage data:', error);
          return null;
        }
      }
      
      const cognitoUser = userPool.getCurrentUser();
      console.log('[AuthService] Current user:', cognitoUser);
      if (!cognitoUser) {
        console.log('[AuthService] No current user found');
        return null;
      }
      
      // We have a Cognito user, check if session is valid
      return new Promise((resolve) => {
        cognitoUser.getSession((err: Error | null, session: any) => {
          if (err) {
            console.error('[AuthService] Session is invalid:', err);
            // Handle missing token errors by signing out and clearing storage
            if (err.message && (
                err.message.includes('Missing tokens') || 
                err.message.includes('missing an ID Token') ||
                err.message.includes('No token found'))) {
              console.log('[AuthService] Missing tokens, clearing session data');
              cognitoUser.signOut();
            }
            resolve(null);
            return;
          }
          
          if (session && session.isValid()) {
            console.log('[AuthService] Valid session found for user:', cognitoUser.getUsername());
            resolve(cognitoUser);
          } else {
            console.log('[AuthService] Session exists but is not valid');
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('[AuthService] Unexpected error in getCurrentUser:', error);
      return null;
    }
  };

  // Forgot password - initiate password reset
  static forgotPassword = (email: string): Promise<void> => {
    const userData = {
      Username: email,
      Pool: userPool
    };
    
    const cognitoUser = new CognitoUser(userData);
    
    return new Promise((resolve, reject) => {
      cognitoUser.forgotPassword({
        onSuccess: () => {
          resolve();
        },
        onFailure: (err) => {
          reject(err);
        }
      });
    });
  };

  // Confirm new password with verification code
  static confirmNewPassword = (email: string, verificationCode: string, newPassword: string): Promise<void> => {
    const userData = {
      Username: email,
      Pool: userPool
    };
    
    const cognitoUser = new CognitoUser(userData);
    
    return new Promise((resolve, reject) => {
      cognitoUser.confirmPassword(verificationCode, newPassword, {
        onSuccess: () => {
          resolve();
        },
        onFailure: (err) => {
          reject(err);
        }
      });
    });
  };

  // Confirm user registration with verification code
  static confirmRegistration = (email: string, verificationCode: string): Promise<void> => {
    const userData = {
      Username: email,
      Pool: userPool
    };
    
    const cognitoUser = new CognitoUser(userData);
    
    return new Promise((resolve, reject) => {
      cognitoUser.confirmRegistration(verificationCode, true, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  };

  // Resend confirmation code
  static resendConfirmationCode = (email: string): Promise<void> => {
    const userData = {
      Username: email,
      Pool: userPool
    };
    
    const cognitoUser = new CognitoUser(userData);
    
    return new Promise((resolve, reject) => {
      cognitoUser.resendConfirmationCode((err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  };
}