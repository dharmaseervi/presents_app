import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { getToken, setResetRequired } from '../lib/auth';
import { API } from '../lib/config';
import React from 'react';

const C = {
  bg: '#000000',
  card: '#0A0A0A',
  border: '#1A1A1A',
  borderBright: '#3F3F46',
  text: '#FFFFFF',
  textDim: '#A1A1AA',
  textFaint: '#27272A',
};

function Field({
  label, value, onChangeText, keyName, focused, onFocus, onBlur,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  keyName: string; focused: string; onFocus: () => void; onBlur: () => void;
}) {
  return (
    <View>
      <Text style={{ fontSize: 11, fontWeight: '700', color: C.textDim, marginBottom: 8 }}>
        {label}
      </Text>
      <View style={{
        backgroundColor: C.card, borderRadius: 12, borderWidth: 1,
        borderColor: focused === keyName ? C.borderBright : C.border,
      }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={C.textDim}
          onFocus={onFocus}
          onBlur={onBlur}
          style={{ fontSize: 15, color: C.text, paddingHorizontal: 16, paddingVertical: 14 }}
        />
      </View>
    </View>
  );
}

export default function ChangePassword() {
  const { forced } = useLocalSearchParams<{ forced?: string }>();
  const isForced = forced === '1';

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState('');

  const handleSubmit = async () => {
    if (!current.trim() || !next.trim() || !confirm.trim()) {
      Alert.alert('Missing info', 'Fill in all fields');
      return;
    }
    if (next.length < 6) {
      Alert.alert('Too short', 'New password must be at least 6 characters');
      return;
    }
    if (next !== confirm) {
      Alert.alert('Mismatch', 'New password and confirmation don\'t match');
      return;
    }
    if (current === next) {
      Alert.alert('Same password', 'New password must be different from current');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/students/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');

      await setResetRequired(false);
      Alert.alert('Success', data.message || 'Password updated successfully');

      if (isForced) {
        router.replace('/(tabs)');
      } else {
        router.back();
      }
    } catch (e: any) {
      Alert.alert('Could not update password', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 24, paddingTop: 60, marginBottom: 40 }}>
            {!isForced && (
              <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 15, color: C.textDim }}>‹ Back</Text>
              </TouchableOpacity>
            )}
            <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.6 }}>
              {isForced ? 'Set a New Password' : 'Change Password'}
            </Text>
            <Text style={{ fontSize: 14, color: C.textDim, marginTop: 8 }}>
              {isForced
                ? 'For security, set a new password before continuing.'
                : 'Update your account password.'}
            </Text>
          </View>

          <View style={{ paddingHorizontal: 24, gap: 18 }}>
            <Field
              label="Current Password"
              value={current}
              onChangeText={setCurrent}
              keyName="current"
              focused={focused}
              onFocus={() => setFocused('current')}
              onBlur={() => setFocused('')}
            />
            <Field label="New Password" value={next} onChangeText={setNext} keyName="next" focused={focused}
              onFocus={() => setFocused('current')}
              onBlur={() => setFocused('')} />
            <Field label="Confirm New Password" value={confirm} onChangeText={setConfirm} keyName="confirm" focused={focused}
              onFocus={() => setFocused('current')}
              onBlur={() => setFocused('')} />
          </View>

          <View style={{ paddingHorizontal: 24, marginTop: 32 }}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              style={{
                backgroundColor: C.text, borderRadius: 14, padding: 18,
                alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? (
                <>
                  <ActivityIndicator color={C.bg} size="small" />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: C.bg }}>Updating...</Text>
                </>
              ) : (
                <Text style={{ fontSize: 15, fontWeight: '700', color: C.bg }}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}