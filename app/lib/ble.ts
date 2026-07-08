import { BleManager } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform, Alert } from 'react-native';
import { getToken } from './auth';


const manager = new BleManager();
const RSSI_THRESHOLD = -120;
const SCAN_DURATION = 30000;

export const checkBLEAvailable = async (): Promise<boolean> => {
  try {
    const state = await manager.state();
    return state === 'PoweredOn';
  } catch (e) {
    return false;
  }
};

export const requestBLEPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;

  const apiLevel = Platform.Version as number;

  if (apiLevel < 31) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ]);

  return Object.values(result).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
};

export const startBLEFlow = async (
  sessionId: string,
  apiUrl: string,
  onDetected: () => void,
  onError: (err: Error) => void
): Promise<() => void> => {
  // Check if BLE is available
  const bleAvailable = await checkBLEAvailable();
  if (!bleAvailable) {
    const err = new Error('Bluetooth is OFF. Turn on Bluetooth and try again.');
    Alert.alert('Bluetooth Disabled', err.message);
    onError(err);
    return () => {};
  }

  const hasPermission = await requestBLEPermission();

  if (!hasPermission) {
    const err = new Error('Bluetooth permission denied');
    Alert.alert('BLE Error', err.message);
    onError(err);
    return () => {};
  }

  const token = await getToken();
  let marked = false;

  manager.startDeviceScan(null, null, async (error, device) => {
    if (error) {
      Alert.alert('BLE Scan Error', error.message);
      onError(error);
      return;
    }

    if (!device || marked) return;

    const uuids = device.serviceUUIDs ?? [];
    const matchedUUID = uuids.some((u) => u.toLowerCase() === sessionId.toLowerCase());
    const matchedName = device.name?.includes('Presentsz') || device.localName?.includes('Presentsz') || false;

    if ((matchedUUID || matchedName) && (device.rssi ?? -999) > RSSI_THRESHOLD) {
      marked = true;
      manager.stopDeviceScan();

      Alert.alert('ESP32 Found! 🎉', `Device: ${device.name ?? device.localName}\nRSSI: ${device.rssi}`);

      try {
        // ONLY call API after BLE confirmed
        const res = await fetch(`${apiUrl}/attendance/mark`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ session_id: sessionId }),
        });

        const text = await res.text();

        if (res.status === 409) {
          Alert.alert('Already Marked', 'You have already marked attendance for this session.');
          onDetected();
          return;
        }

        if (!res.ok) {
          throw new Error(`API failed: ${res.status}\n${text}`);
        }

        Alert.alert('Success ✓', 'Attendance marked via BLE!');
        onDetected();
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to mark attendance');
        onError(e);
      }
    }
  });

  const timeout = setTimeout(() => {
    if (!marked) {
      manager.stopDeviceScan();
      const err = new Error('ESP32 not found. Make sure:\n1. ESP32 is powered ON\n2. Blue LED is ON\n3. Bluetooth is ON');
      Alert.alert('BLE Timeout', err.message);
      onError(err);
    }
  }, SCAN_DURATION);

  return () => {
    clearTimeout(timeout);
    manager.stopDeviceScan();
  };
};