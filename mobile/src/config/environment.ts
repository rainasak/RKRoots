import Constants from 'expo-constants';

interface Environment {
  apiUrl: string;
  environment: 'development' | 'preview' | 'production';
}

const getEnvironment = (): Environment => {
  const apiUrl = Constants.expoConfig?.extra?.API_URL || process.env.EXPO_PUBLIC_API_URL;
  
  if (__DEV__) {
    return {
      apiUrl: apiUrl || 'http://localhost:3000/api/v1',
      environment: 'development',
    };
  }

  return {
    apiUrl: apiUrl || 'https://rkroots-backend.railway.app/api/v1',
    environment: 'production',
  };
};

export const environment = getEnvironment();
