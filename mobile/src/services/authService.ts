import api from './api';
import * as Keychain from 'react-native-keychain';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

interface SignupData {
  email: string;
  password: string;
  displayName: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    userId: string;
    email: string;
    displayName: string;
    profilePictureUrl?: string;
  };
}

interface AppleAuthData {
  identityToken: string;
  user?: {
    email?: string;
    name?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

const TOKEN_KEY = 'rkroots_auth';
const REFRESH_TOKEN_KEY = 'rkroots_refresh';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

async function storeTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Keychain.setGenericPassword(TOKEN_KEY, accessToken, { service: TOKEN_KEY });
  await Keychain.setGenericPassword(REFRESH_TOKEN_KEY, refreshToken, { service: REFRESH_TOKEN_KEY });
}

async function clearTokens(): Promise<void> {
  await Keychain.resetGenericPassword({ service: TOKEN_KEY });
  await Keychain.resetGenericPassword({ service: REFRESH_TOKEN_KEY });
}

async function getStoredTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
  const accessCreds = await Keychain.getGenericPassword({ service: TOKEN_KEY });
  const refreshCreds = await Keychain.getGenericPassword({ service: REFRESH_TOKEN_KEY });
  
  if (accessCreds && refreshCreds) {
    return {
      accessToken: accessCreds.password,
      refreshToken: refreshCreds.password,
    };
  }
  return null;
}

export const authService = {
  async signup(data: SignupData): Promise<AuthResponse> {
    const response = await api.post('/auth/signup', data);
    const { accessToken, refreshToken } = response.data;
    await storeTokens(accessToken, refreshToken);
    return response.data;
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post('/auth/login', data);
    const { accessToken, refreshToken } = response.data;
    await storeTokens(accessToken, refreshToken);
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      const isSignedIn = await GoogleSignin.isSignedIn();
      if (isSignedIn) {
        await GoogleSignin.signOut();
      }
    } catch {
      // Ignore Google sign out errors
    }
    await clearTokens();
  },

  async refreshToken(): Promise<AuthResponse> {
    const tokens = await getStoredTokens();
    if (!tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await api.post('/auth/refresh', { refreshToken: tokens.refreshToken });
    const { accessToken, refreshToken: newRefreshToken } = response.data;
    await storeTokens(accessToken, newRefreshToken);
    return response.data;
  },

  async getStoredTokens() {
    return getStoredTokens();
  },

  async googleSignIn(): Promise<AuthResponse> {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const { idToken } = await GoogleSignin.getTokens();
    
    if (!idToken) {
      throw new Error('Failed to get Google ID token');
    }

    const response = await api.post('/auth/google/mobile', { idToken });
    const { accessToken, refreshToken } = response.data;
    await storeTokens(accessToken, refreshToken);
    return response.data;
  },

  async appleSignIn(appleData: AppleAuthData): Promise<AuthResponse> {
    const response = await api.post('/auth/apple', appleData);
    const { accessToken, refreshToken } = response.data;
    await storeTokens(accessToken, refreshToken);
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/auth/profile');
    return response.data;
  },
};
