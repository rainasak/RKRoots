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

interface LoginScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter email and password');
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      const response = await authService.login({ email: email.trim(), password });
      dispatch(setUser(response.user));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setIsLoading(true);
      dispatch(setLoading(true));
      const response = await authService.googleSignIn();
      dispatch(setUser(response.user));
    } catch (err: any) {
      setError(err.message || 'Google sign in failed');
      dispatch(setLoading(false));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setError('');
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
        setError(err.message || 'Apple sign in failed');
      }
      dispatch(setLoading(false));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>RKRoots</Text>
        <Text style={styles.subtitle}>Connect your family history</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!isLoading}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            editable={!isLoading}
          />
          
          {error ? <Text style={styles.error}>{error}</Text> : null}
          
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
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
          onPress={() => navigation.navigate('Register')}
          disabled={isLoading}
        >
          <Text style={styles.link}>Don't have an account? Sign up</Text>
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
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    fontSize: 16,
    color: '#1a1a1a',
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
  error: {
    color: '#dc3545',
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 14,
  },
});

export default LoginScreen;