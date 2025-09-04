import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Link, useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function ConfirmRegistrationScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { confirmRegistration, resendConfirmationCode } = useAuth();

  const handleConfirmRegistration = async () => {
    if (!verificationCode) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setIsLoading(true);
    try {
      await confirmRegistration(email as string, verificationCode);
      
      Alert.alert(
        'Success',
        'Your account has been verified successfully!',
        [
          {
            text: 'Sign In',
            onPress: () => router.push('/(auth)/sign-in')
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Failed to verify account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      Alert.alert('Error', 'Email address is required');
      return;
    }

    setIsResending(true);
    try {
      await resendConfirmationCode(email as string);
      Alert.alert('Success', 'A new verification code has been sent to your email');
    } catch (error: any) {
      Alert.alert('Failed to Resend Code', error.message || 'An error occurred');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.title}>Verify Your Account</Text>
          <Text style={styles.subtitle}>
            We've sent a verification code to your email.
            Please enter it below to complete your registration.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, { color: '#666' }]}
              value={email as string}
              editable={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Verification Code</Text>
            <TextInput
              style={styles.input}
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholder="Enter verification code"
              keyboardType="number-pad"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleConfirmRegistration}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.linksContainer}>
            <TouchableOpacity 
              style={styles.linkContainer}
              onPress={handleResendCode}
              disabled={isResending}
            >
              {isResending ? (
                <ActivityIndicator size="small" color="#007bff" />
              ) : (
                <Text style={styles.linkText}>Resend Verification Code</Text>
              )}
            </TouchableOpacity>

            <Link href="/(auth)/sign-in" asChild>
              <TouchableOpacity style={styles.linkContainer}>
                <Text style={styles.linkText}>Back to Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linksContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkContainer: {
    marginVertical: 10,
    padding: 5,
  },
  linkText: {
    color: '#007bff',
    fontSize: 16,
  },
});