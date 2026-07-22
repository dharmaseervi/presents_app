import { BleManager } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform, Alert } from 'react-native';
import { getToken } from './auth';

const manager = new BleManager();
const RSSI_THRESHOLD = -85; // more lenient — phone-to-phone, not a fixed classroom beacon
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

    // Match ONLY on service UUID — the professor's phone advertises the
    // session ID as a service UUID. Device name is not reliable (iOS drops
    // it when the advertiser's app is backgrounded), so it's not used at all.
    const uuids = device.serviceUUIDs ?? [];
    const matched = uuids.some((u) => u.toLowerCase() === sessionId.toLowerCase());

    if (matched && (device.rssi ?? -999) > RSSI_THRESHOLD) {
      marked = true;
      manager.stopDeviceScan();

      try {
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

        Alert.alert('Success ✓', 'Attendance marked!');
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
      const err = new Error(
        "Professor's session not detected. Make sure:\n1. You're in the classroom\n2. Bluetooth is ON\n3. The session is still active"
      );
      Alert.alert('Not Found', err.message);
      onError(err);
    }
  }, SCAN_DURATION);

  return () => {
    clearTimeout(timeout);
    manager.stopDeviceScan();
  };
};