import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const TOKEN_KEY = 'presentsz_token';
const USER_ID_KEY = 'presentsz_user_id';
const BLE_UUID_KEY = 'presentsz_ble_uuid';

export const saveToken = async (token: string, userId: string) => {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid token');
  }
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid user ID');
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_ID_KEY, userId);
};

export const getToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync(TOKEN_KEY);
};

export const getUserId = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync(USER_ID_KEY);
};

export const clearToken = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_ID_KEY);
};

export const isLoggedIn = async (): Promise<boolean> => {
  const token = await getToken();
  return token !== null;
};

export const getOrCreateBLEUUID = async (): Promise<string> => {
  // Return existing UUID if already created
  let uuid = await SecureStore.getItemAsync(BLE_UUID_KEY);
  if (uuid) return uuid;

  // Generate a new UUID without external library
  uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

  await SecureStore.setItemAsync(BLE_UUID_KEY, uuid);
  return uuid;
};


export const getBLEUUID = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync(BLE_UUID_KEY);
};