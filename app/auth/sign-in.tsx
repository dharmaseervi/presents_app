// app/auth/sign-in.tsx
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { saveToken } from '../lib/auth';
import { API } from '../lib/config';

const C = {
  bg: '#000000',
  card: '#0A0A0A',
  border: '#1A1A1A',
  borderStrong: '#2A2A2A',
  borderFocus: '#3F3F46',
  text: '#FFFFFF',
  textDim: '#A1A1AA',
  textMuted: '#52525B',
  textFaint: '#27272A',
};

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState('');

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Info', 'Please enter both email and password');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sign in failed');
      await saveToken(data.token, data.student_id);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Sign In Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo / Header */}
          <View style={{ paddingHorizontal: 24, paddingTop: 60, marginBottom: 60 }}>
            <View style={{
              width: 56, height: 56, borderRadius: 16,
              backgroundColor: C.text,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 32,
            }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: C.bg }}>P</Text>
            </View>

            <Text style={{ fontSize: 32, fontWeight: '800', color: C.text, letterSpacing: -1 }}>
              Welcome back
            </Text>
            <Text style={{ fontSize: 15, color: C.textDim, marginTop: 8 }}>
              Sign in to mark your attendance
            </Text>
          </View>

          {/* Form */}
          <View style={{ paddingHorizontal: 24, gap: 20 }}>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.textDim, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
                Email
              </Text>
              <View style={{
                backgroundColor: C.card, borderRadius: 12,
                borderWidth: 1,
                borderColor: focused === 'email' ? C.borderFocus : C.border,
              }}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="samarth@example.com"
                  placeholderTextColor={C.textFaint}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused('')}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={{
                    fontSize: 15, color: C.text,
                    paddingHorizontal: 16, paddingVertical: 14,
                  }}
                />
              </View>
            </View>

            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.textDim, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
                Password
              </Text>
              <View style={{
                backgroundColor: C.card, borderRadius: 12,
                borderWidth: 1,
                borderColor: focused === 'password' ? C.borderFocus : C.border,
              }}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={C.textFaint}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused('')}
                  secureTextEntry
                  style={{
                    fontSize: 15, color: C.text,
                    paddingHorizontal: 16, paddingVertical: 14,
                  }}
                />
              </View>
            </View>
          </View>

          {/* Sign In Button */}
          <View style={{ paddingHorizontal: 24, marginTop: 32 }}>
            <TouchableOpacity
              onPress={handleSignIn}
              disabled={loading}
              style={{
                backgroundColor: C.text,
                borderRadius: 14, padding: 18,
                alignItems: 'center', justifyContent: 'center',
                flexDirection: 'row', gap: 8,
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? (
                <>
                  <ActivityIndicator color={C.bg} size="small" />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: C.bg }}>Signing in...</Text>
                </>
              ) : (
                <Text style={{ fontSize: 15, fontWeight: '700', color: C.bg }}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/auth/sign-up')}
              style={{ marginTop: 20, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 13, color: C.textDim }}>
                Don't have an account? <Text style={{ color: C.text, fontWeight: '700' }}>Create one</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}