import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { CognitoUser } from 'amazon-cognito-identity-js';
import { router } from 'expo-router';
import { AuthService } from '../services/AuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: CognitoUser | null;
  loading: boolean;
  signUp: (fullName: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  forgotPassword: (email: string) => Promise<void>;
  confirmNewPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  confirmRegistration: (email: string, code: string) => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<CognitoUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing authenticated user on app start
    const checkUser = async () => {
      try {
        setLoading(true);
        
        // Wait a bit to allow AsyncStorage to initialize properly
        // This helps with some edge cases on app start
        setTimeout(async () => {
          try {
            const currentUser = await AuthService.getCurrentUser();
            
            if (currentUser) {
              // If we get here, user is authenticated
              setUser(currentUser);
            } else {
              // User is not authenticated
              setUser(null);
            }
          } catch (error) {
            console.error('Error checking user authentication:', error);
            // Clear any invalid session data
            await AuthService.signOut();
            setUser(null);
          } finally {
            setLoading(false);
          }
        }, 500); // Small delay to ensure AsyncStorage is ready
      } catch (error) {
        console.error('Critical error in authentication check:', error);
        setLoading(false);
        setUser(null);
      }
    };

    checkUser();
  }, []);

  const signUp = async (fullName: string, email: string, password: string) => {
    try {
      await AuthService.signUp({ fullName, email, password });
      // Don't navigate here, let the sign-up screen handle the navigation
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const cognitoUser = await AuthService.signIn({ email, password });
      setUser(cognitoUser);
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signOut = () => {
    AuthService.signOut();
    setUser(null);
    router.replace('/(auth)/sign-in');
  };

  const forgotPassword = async (email: string) => {
    try {
      await AuthService.forgotPassword(email);
    } catch (error) {
      console.error('Error requesting password reset:', error);
      throw error;
    }
  };

  const confirmNewPassword = async (email: string, code: string, newPassword: string) => {
    try {
      await AuthService.confirmNewPassword(email, code, newPassword);
      router.push('/(auth)/sign-in');
    } catch (error) {
      console.error('Error confirming new password:', error);
      throw error;
    }
  };

  const confirmRegistration = async (email: string, code: string) => {
    try {
      await AuthService.confirmRegistration(email, code);
    } catch (error) {
      console.error('Error confirming registration:', error);
      throw error;
    }
  };

  const resendConfirmationCode = async (email: string) => {
    try {
      await AuthService.resendConfirmationCode(email);
    } catch (error) {
      console.error('Error resending confirmation code:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    forgotPassword,
    confirmNewPassword,
    confirmRegistration,
    resendConfirmationCode
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};