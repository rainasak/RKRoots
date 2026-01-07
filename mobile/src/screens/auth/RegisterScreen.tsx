import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { authService } from '../../services/authService';
import { setUser, setLoading } from '../../store/slices/authSlice';

interface RegisterScreenProps {
  navigation: {
    navigate: (screen: string) => void;
    goBack: () => void;
  };
}

interface ValidationErrors {
  displayName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    } else if (displayName.trim().length < 2) {
      newErrors.displayName = 'Display name must be at least 2 characters';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = 'Password must contain an uppercase letter';
    } else if (!/[a-z]/.test(password)) {
      newErrors.password = 'Password must contain a lowercase letter';
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = 'Password must contain a number';
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      newErrors.password = 'Password must contain a special character';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setServerError('');
      setIsLoading(true);
      const response = await authService.signup({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
      });
      dispatch(setUser(response.user));
    } catch (err: any) {
      setServerError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setServerError('');
      setIsLoading(true);
      dispatch(setLoading(true));
      const response = await authService.googleSignIn();
      dispatch(setUser(response.user));
    } catch (err: any) {
      setServerError(err.message || 'Google sign in failed');
      dispatch(setLoading(false));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setServerError('');
      setIsLoading(true);
      dispatch(setLoading(true));
      
      const appleAuth = require('@invertase/react-native-apple-authentication').default;
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      const { identityToken, email: appleEmail, fullName } = appleAuthRequestResponse;
      
      if (!identityToken) {
        throw new Error('Apple Sign In failed - no identity token');
      }

      const response = await authService.appleSignIn({
        identityToken,
        user: {
          email: appleEmail || undefined,
          name: fullName ? {
            firstName: fullName.givenName || undefined,
            lastName: fullName.familyName || undefined,
          } : undefined,
        },
      });
      
      dispatch(setUser(response.user));
    } catch (err: any) {
      if (err.code !== '1001') {
        setServerError(err.message || 'Apple sign in failed');
      }
      dispatch(setLoading(false));
    } finally {
      setIsLoading(false);
    }
  };

  const renderInput = (
    placeholder: string,
    value: string,
    onChangeText: (text: string) => void,
    error?: string,
    options?: {
      secureTextEntry?: boolean;
      keyboardType?: 'default' | 'email-address';
      autoCapitalize?: 'none' | 'sentences' | 'words';
      autoComplete?: 'name' | 'email' | 'password' | 'password-new';
    }
  ) => (
    <View style={styles.inputContainer}>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholder={placeholder}
        placeholderTextColor="#999"
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
          if (errors[placeholder.toLowerCase().replace(' ', '') as keyof ValidationErrors]) {
            setErrors((prev) => ({ ...prev, [placeholder.toLowerCase().replace(' ', '')]: undefined }));
          }
        }}
        secureTextEntry={options?.secureTextEntry}
        keyboardType={options?.keyboardType || 'default'}
        autoCapitalize={options?.autoCapitalize || 'sentences'}
        autoComplete={options?.autoComplete}
        editable={!isLoading}
      />
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join RKRoots and start building your family tree</Text>

        <View style={styles.form}>
          {renderInput('Display Name', displayName, setDisplayName, errors.displayName, {
            autoCapitalize: 'words',
            autoComplete: 'name',
          })}
          {renderInput('Email', email, setEmail, errors.email, {
            keyboardType: 'email-address',
            autoCapitalize: 'none',
            autoComplete: 'email',
          })}
          {renderInput('Password', password, setPassword, errors.password, {
            secureTextEntry: true,
            autoComplete: 'password-new',
          })}
          {renderInput('Confirm Password', confirmPassword, setConfirmPassword, errors.confirmPassword, {
            secureTextEntry: true,
            autoComplete: 'password-new',
          })}
          
          {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}
          
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]} 
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or sign up with</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.oauthButtons}>
          <TouchableOpacity 
            style={[styles.button, styles.oauthButton]}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            <Text style={styles.oauthButtonText}>🔵 Google</Text>
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity 
              style={[styles.button, styles.oauthButton, styles.appleButton]}
              onPress={handleAppleSignIn}
              disabled={isLoading}
            >
              <Text style={[styles.oauthButtonText, styles.appleButtonText]}> Apple</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          disabled={isLoading}
        >
          <Text style={styles.link}>Already have an account? Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  fieldError: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  oauthButtons: {
    gap: 12,
    marginBottom: 24,
  },
  oauthButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  oauthButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '500',
  },
  appleButton: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  appleButtonText: {
    color: '#fff',
  },
  link: {
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 15,
  },
  serverError: {
    color: '#dc3545',
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 14,
  },
});

export default RegisterScreen;