// app/(auth)/sign-in.tsx
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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../context/AuthContext';
import { Link, router } from 'expo-router';
import { signInSchema, SignInFormData } from '../../types/authSchema';
import { setMyRealTokens } from '../../services/setMyTokens';

export default function SignInScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingTokens, setIsSettingTokens] = useState(false);
  const { signIn } = useAuth();

  const { 
    control, 
    handleSubmit, 
    formState: { errors, isValid } 
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onSubmit', // Validate on form submission
  });

  // Submit handler - receives validated data
  const onSubmit = async (data: SignInFormData) => {
    setIsLoading(true);
    try {
      await signIn(data.email, data.password);
      // Navigation will be handled by the auth context
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message || 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Development function to set tokens directly
  const handleDevLogin = async () => {
    setIsSettingTokens(true);
    try {
      const success = await setMyRealTokens();
      if (success) {
        Alert.alert('Success', 'Development authentication successful!', [
          {
            text: 'Continue',
            onPress: () => router.replace('/(tabs)/Calendar')
          }
        ]);
      } else {
        Alert.alert('Error', 'Failed to set development tokens');
      }
    } catch (error) {
      Alert.alert('Error', `Development login failed: ${error}`);
    } finally {
      setIsSettingTokens(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.title}>Sign In</Text>
          
          {/* Email Input with Controller */}
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[
                    styles.input,
                    error && styles.inputError // Red border if error
                  ]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                />
                {error && (
                  <Text style={styles.errorText}>{error.message}</Text>
                )}
              </View>
            )}
          />
          
          {/* Password Input with Controller */}
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={[
                    styles.input,
                    error && styles.inputError
                  ]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter your password"
                  secureTextEntry
                />
                {error && (
                  <Text style={styles.errorText}>{error.message}</Text>
                )}
              </View>
            )}
          />
          
          {/* Submit Button */}
          <TouchableOpacity 
            style={[
              styles.button,
              (!isValid || isLoading) && styles.buttonDisabled
            ]} 
            onPress={handleSubmit(onSubmit)} // handleSubmit validates then calls onSubmit
            disabled={isLoading || !isValid}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Development Login Button */}
          <TouchableOpacity 
            style={[styles.button, styles.devButton]} 
            onPress={handleDevLogin}
            disabled={isSettingTokens}
          >
            {isSettingTokens ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>🚀 Dev Login (Tomer)</Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.linksContainer}>
            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity style={styles.linkContainer}>
                <Text style={styles.linkText}>Forgot Password?</Text>
              </TouchableOpacity>
            </Link>
            
            <Link href="/(auth)/sign-up" asChild>
              <TouchableOpacity style={styles.linkContainer}>
                <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
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
    marginBottom: 30,
    textAlign: 'center',
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
  // New styles for validation
  inputError: {
    borderColor: '#ff6b6b',
    borderWidth: 2,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginTop: 5,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  devButton: {
    backgroundColor: '#28a745',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linksContainer: {
    marginTop: 20,
  },
  linkContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  linkText: {
    color: '#007bff',
    fontSize: 16,
  },
});