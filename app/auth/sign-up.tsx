// app/auth/sign-up.tsx
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { saveToken, getOrCreateBLEUUID } from '../lib/auth';
import { API } from '../lib/config';

const C = {
  bg: '#000000',
  card: '#0A0A0A',
  cardElevated: '#141414',
  border: '#1A1A1A',
  borderStrong: '#2A2A2A',
  borderFocus: '#3F3F46',
  text: '#FFFFFF',
  textDim: '#A1A1AA',
  textMuted: '#52525B',
  textFaint: '#27272A',
  green: '#22C55E',
  red: '#EF4444',
};

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const DEPARTMENTS = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL'];

type Step = 'basic' | 'academic' | 'security';

export default function SignUp() {
  const [step, setStep] = useState<Step>('basic');
  const [loading, setLoading] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [year, setYear] = useState('');
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Focused input tracking
  const [focused, setFocused] = useState<string>('');

  const validateStep = (): boolean => {
    if (step === 'basic') {
      if (!name.trim()) { Alert.alert('Missing Info', 'Please enter your full name'); return false; }
      if (!email.trim() || !email.includes('@')) { Alert.alert('Invalid Email', 'Please enter a valid email'); return false; }
      if (!rollNumber.trim()) { Alert.alert('Missing Info', 'Please enter your roll number'); return false; }
    }
    if (step === 'academic') {
      if (!year) { Alert.alert('Missing Info', 'Please select your year'); return false; }
      if (!department) { Alert.alert('Missing Info', 'Please select your department'); return false; }
      if (!semester.trim()) { Alert.alert('Missing Info', 'Please enter your semester'); return false; }
    }
    if (step === 'security') {
      if (password.length < 6) { Alert.alert('Weak Password', 'Password must be at least 6 characters'); return false; }
      if (password !== confirmPassword) { Alert.alert('Password Mismatch', 'Passwords do not match'); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step === 'basic') setStep('academic');
    else if (step === 'academic') setStep('security');
    else if (step === 'security') handleSignUp();
  };

  const handleBack = () => {
    if (step === 'academic') setStep('basic');
    else if (step === 'security') setStep('academic');
  };

  const handleSignUp = async () => {
    setLoading(true);
    try {
      const bleUuid = await getOrCreateBLEUUID();
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, roll_number: rollNumber,
          year, department, semester, password,
          ble_uuid: bleUuid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sign up failed');
      await saveToken(data.token, data.student_id);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Sign Up Failed', e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const stepNumber = step === 'basic' ? 1 : step === 'academic' ? 2 : 3;
  const stepTitle = step === 'basic' ? 'Basic Details' : step === 'academic' ? 'Academic Info' : 'Set Password';
  const stepDescription = step === 'basic'
    ? 'Let\'s start with your personal information'
    : step === 'academic'
      ? 'Tell us about your studies'
      : 'Secure your account';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
            {/* Back Button + Step Indicator */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
              {step !== 'basic' ? (
                <TouchableOpacity onPress={handleBack} style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: C.card,
                  borderWidth: 1, borderColor: C.borderStrong,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 18, color: C.text }}>←</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ width: 40 }} />
              )}

              {/* Step dots */}
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[1, 2, 3].map(n => (
                  <View
                    key={n}
                    style={{
                      width: n === stepNumber ? 24 : 6,
                      height: 6, borderRadius: 3,
                      backgroundColor: n <= stepNumber ? C.text : C.borderStrong,
                    }}
                  />
                ))}
              </View>

              <View style={{ width: 40 }} />
            </View>

            {/* Step Info */}
            <Text style={{ fontSize: 12, color: C.textMuted, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
              Step {stepNumber} of 3
            </Text>
            <Text style={{ fontSize: 32, fontWeight: '800', color: C.text, marginTop: 8, letterSpacing: -1 }}>
              {stepTitle}
            </Text>
            <Text style={{ fontSize: 14, color: C.textDim, marginTop: 8 }}>
              {stepDescription}
            </Text>
          </View>

          {/* Form */}
          <View style={{ paddingHorizontal: 24, marginTop: 40 }}>
            {step === 'basic' && (
              <View style={{ gap: 20 }}>
                <FormInput
                  label="Full Name"
                  value={name}
                  onChangeText={setName}
                  placeholder="Samarth Ravi"
                  focused={focused === 'name'}
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused('')}
                />
                <FormInput
                  label="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="samarth@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  focused={focused === 'email'}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused('')}
                />
                <FormInput
                  label="Roll Number"
                  value={rollNumber}
                  onChangeText={setRollNumber}
                  placeholder="19BTDJEO41"
                  autoCapitalize="characters"
                  focused={focused === 'roll'}
                  onFocus={() => setFocused('roll')}
                  onBlur={() => setFocused('')}
                />
              </View>
            )}

            {step === 'academic' && (
              <View style={{ gap: 24 }}>
                {/* Year Selector */}
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: C.textDim, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>
                    Year
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {YEARS.map(y => (
                      <TouchableOpacity
                        key={y}
                        onPress={() => setYear(y)}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 10,
                          borderRadius: 10,
                          backgroundColor: year === y ? C.text : C.card,
                          borderWidth: 1,
                          borderColor: year === y ? C.text : C.border,
                        }}
                      >
                        <Text style={{
                          fontSize: 13, fontWeight: '700',
                          color: year === y ? C.bg : C.text,
                        }}>
                          {y}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Department Selector */}
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: C.textDim, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>
                    Department
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {DEPARTMENTS.map(d => (
                      <TouchableOpacity
                        key={d}
                        onPress={() => setDepartment(d)}
                        style={{
                          paddingHorizontal: 16, paddingVertical: 10,
                          borderRadius: 10,
                          backgroundColor: department === d ? C.text : C.card,
                          borderWidth: 1,
                          borderColor: department === d ? C.text : C.border,
                        }}
                      >
                        <Text style={{
                          fontSize: 13, fontWeight: '700',
                          color: department === d ? C.bg : C.text,
                        }}>
                          {d}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Semester Input */}
                <FormInput
                  label="Current Semester"
                  value={semester}
                  onChangeText={setSemester}
                  placeholder="1"
                  keyboardType="numeric"
                  focused={focused === 'sem'}
                  onFocus={() => setFocused('sem')}
                  onBlur={() => setFocused('')}
                />
              </View>
            )}

            {step === 'security' && (
              <View style={{ gap: 20 }}>
                <FormInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  secureTextEntry
                  focused={focused === 'pass'}
                  onFocus={() => setFocused('pass')}
                  onBlur={() => setFocused('')}
                />
                <FormInput
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your password"
                  secureTextEntry
                  focused={focused === 'confirm'}
                  onFocus={() => setFocused('confirm')}
                  onBlur={() => setFocused('')}
                />

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <View style={{
                    backgroundColor: C.card,
                    borderRadius: 12, padding: 14,
                    borderWidth: 1, borderColor: C.border,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: C.textDim, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
                      Password Strength
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {[1, 2, 3, 4].map(i => (
                        <View
                          key={i}
                          style={{
                            flex: 1, height: 4, borderRadius: 2,
                            backgroundColor: password.length >= i * 2 ? C.text : C.borderStrong,
                          }}
                        />
                      ))}
                    </View>
                    <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>
                      {password.length < 6 ? 'Too short' :
                        password.length < 10 ? 'Good' :
                          'Strong'}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Action Button */}
          <View style={{ paddingHorizontal: 24, marginTop: 40 }}>
            <TouchableOpacity
              onPress={handleNext}
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
                  <Text style={{ fontSize: 15, fontWeight: '700', color: C.bg }}>Creating account...</Text>
                </>
              ) : (
                <Text style={{ fontSize: 15, fontWeight: '700', color: C.bg }}>
                  {step === 'security' ? 'Create Account' : 'Continue'}
                </Text>
              )}
            </TouchableOpacity>

            {step === 'basic' && (
              <TouchableOpacity
                onPress={() => router.push('/auth/sign-in')}
                style={{ marginTop: 20, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 13, color: C.textDim }}>
                  Already have an account? <Text style={{ color: C.text, fontWeight: '700' }}>Sign in</Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Reusable Input Component
const FormInput = ({ label, value, onChangeText, placeholder, focused, onFocus, onBlur, ...props }: any) => (
  <View>
    <Text style={{
      fontSize: 12, fontWeight: '700', color: C.textDim,
      letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8,
    }}>
      {label}
    </Text>
    <View style={{
      backgroundColor: C.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: focused ? C.borderFocus : C.border,
    }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textFaint}
        onFocus={onFocus}
        onBlur={onBlur}
        style={{
          fontSize: 15, fontWeight: '500',
          color: C.text,
          paddingHorizontal: 16, paddingVertical: 14,
        }}
        {...props}
      />
    </View>
  </View>
);