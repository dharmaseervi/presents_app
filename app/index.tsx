import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import * as Device from 'expo-device';
import { isLoggedIn, getToken, getUserId, getOrCreateBLEUUID, getResetRequired } from './lib/auth';
import { API } from './lib/config';
import React from 'react';

export default function Index() {
  const [checked, setChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [needsReset, setNeedsReset] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const loggedInResult = await isLoggedIn();
      if (loggedInResult) {
        await registerBLE();
        const resetRequired = await getResetRequired();
        setNeedsReset(resetRequired);
      }
      setLoggedIn(loggedInResult);
    } catch (e) {
      console.error('Auth check failed', e);
      setLoggedIn(false);
    } finally {
      setChecked(true);
    }
  };

  const registerBLE = async () => {
    try {
      const token = await getToken();
      const userId = await getUserId();
      const bleUUID = await getOrCreateBLEUUID();

      await fetch(`${API}/students/${userId}/register-ble`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ble_uuid: bleUUID,
          device_id: Device.modelId ?? Device.deviceName ?? 'unknown',
        }),
      });

      console.log('BLE UUID registered:', bleUUID);
    } catch (e) {
      // Non-fatal — expected to fail with 409 after first successful registration
      console.warn('BLE registration failed:', e);
    }
  };

  if (!checked) return null;
  if (loggedIn && needsReset) return <Redirect href="/auth/change-password?forced=1" />;
  return <Redirect href={loggedIn ? '/(tabs)' : '/auth/sign-in'} />;
}