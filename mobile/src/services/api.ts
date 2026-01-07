import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as Keychain from 'react-native-keychain';
import { environment } from '../config/environment';

const TOKEN_KEY = 'rkroots_auth';
const REFRESH_TOKEN_KEY = 'rkroots_refresh';

const api = axios.create({
  baseURL: environment.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

let refreshPromise: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  const refreshCreds = await Keychain.getGenericPassword({ service: REFRESH_TOKEN_KEY });
  
  if (!refreshCreds) {
    throw new Error('No refresh token available');
  }

  const response = await axios.post(
    `${environment.apiUrl}/auth/refresh`,
    { refreshToken: refreshCreds.password },
    { headers: { 'Content-Type': 'application/json' } }
  );

  const { accessToken, refreshToken: newRefreshToken } = response.data;

  await Keychain.setGenericPassword(TOKEN_KEY, accessToken, { service: TOKEN_KEY });
  await Keychain.setGenericPassword(REFRESH_TOKEN_KEY, newRefreshToken, { service: REFRESH_TOKEN_KEY });

  return accessToken;
}

api.interceptors.request.use(async (config) => {
  const credentials = await Keychain.getGenericPassword({ service: TOKEN_KEY });
  if (credentials) {
    config.headers.Authorization = `Bearer ${credentials.password}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Reuse existing refresh promise if one is in progress
        if (!refreshPromise) {
          refreshPromise = doRefresh();
        }

        const token = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        await Keychain.resetGenericPassword({ service: TOKEN_KEY });
        await Keychain.resetGenericPassword({ service: REFRESH_TOKEN_KEY });
        return Promise.reject(refreshError);
      } finally {
        refreshPromise = null;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
