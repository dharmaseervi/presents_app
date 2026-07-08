import { Platform } from 'react-native';

const LOCAL_IP = 'localhost'; // your Mac's IP on local network

function getApiUrl(): string {
  if (__DEV__) {
    if (Platform.OS === 'ios') {
      // iOS simulator → localhost works
      // Real iPhone → use Mac IP
      return `http://${LOCAL_IP}:8080`;
    }
    if (Platform.OS === 'android') {
      // Android emulator → 10.0.2.2
      // Real Android phone → use Mac IP
      // We can't easily distinguish — use Mac IP, works for both
      return `http://${LOCAL_IP}:8080`;
    }
  }
  return 'https://presentsz-server.onrender.com'; // production URL when deployed
}

export const API = getApiUrl();