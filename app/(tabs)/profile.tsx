// app/(tabs)/profile.tsx
import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { getToken, getUserId, clearToken } from '../lib/auth';
import { API } from '../lib/config';

const C = {
  bg: '#000000',
  card: '#0A0A0A',
  cardElevated: '#141414',
  border: '#1A1A1A',
  borderStrong: '#2A2A2A',
  borderBright: '#3F3F46',
  text: '#FFFFFF',
  textDim: '#A1A1AA',
  textMuted: '#52525B',
  textFaint: '#27272A',
  green: '#22C55E',
  red: '#EF4444',
};

type Student = {
  id: string;
  name: string;
  email: string;
  roll_number: string;
  year: string;
  semester: string;
  department: string;
};

export default function ProfileScreen() {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ present: 0, absent: 0, rate: 0, total: 0 });

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const token = await getToken();
      const userId = await getUserId();
      const res = await fetch(`${API}/students/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setStudent(data);
        if (token && userId) await fetchStats(userId, token);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const fetchStats = async (userId: string, token: string) => {
    try {
      const res = await fetch(`${API}/students/${userId}/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.records) {
        const present = data.records.filter((r: any) => r.status === 'present').length;
        const total = data.records.length;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;
        setStats({ present, absent: total - present, rate, total });
      }
    } catch (e) { console.error(e); }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await clearToken();
            router.replace('/auth/sign-in');
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.text} size="large" />
      </SafeAreaView>
    );
  }

  const initials = student?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.text} />}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}>
          <Text style={{ fontSize: 12, color: C.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: '600' }}>
            Account
          </Text>
          <Text style={{ fontSize: 28, fontWeight: '800', color: C.text, marginTop: 4, letterSpacing: -0.8 }}>
            Profile
          </Text>
        </View>

        {/* Profile Card - Big avatar with basic info */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{
            backgroundColor: C.card,
            borderRadius: 20,
            padding: 24,
            borderWidth: 1,
            borderColor: C.border,
            alignItems: 'center',
          }}>
            {/* Avatar */}
            <View style={{
              width: 88, height: 88, borderRadius: 44,
              backgroundColor: C.text,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              <Text style={{ fontSize: 32, fontWeight: '800', color: C.bg, letterSpacing: -1 }}>
                {initials}
              </Text>
            </View>

            {/* Name */}
            <Text style={{ fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5 }}>
              {student?.name}
            </Text>
            <Text style={{ fontSize: 13, color: C.textDim, marginTop: 4 }}>
              {student?.email}
            </Text>

            {/* Chips */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <View style={{
                paddingHorizontal: 12, paddingVertical: 6,
                backgroundColor: C.cardElevated,
                borderWidth: 1, borderColor: C.borderStrong,
                borderRadius: 8,
              }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: C.text, letterSpacing: 0.3 }}>
                  {student?.department}
                </Text>
              </View>
              <View style={{
                paddingHorizontal: 12, paddingVertical: 6,
                backgroundColor: C.cardElevated,
                borderWidth: 1, borderColor: C.borderStrong,
                borderRadius: 8,
              }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: C.text, letterSpacing: 0.3 }}>
                  {student?.year}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Card */}
        <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
          <View style={{
            backgroundColor: C.card,
            borderRadius: 20,
            padding: 24,
            borderWidth: 1,
            borderColor: C.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 11, color: C.textMuted, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
                Attendance Overview
              </Text>
              <View style={{
                paddingHorizontal: 8, paddingVertical: 3,
                backgroundColor: C.cardElevated,
                borderWidth: 1, borderColor: C.borderStrong,
                borderRadius: 6,
              }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: stats.rate >= 75 ? C.text : C.textDim, letterSpacing: 0.3 }}>
                  {stats.rate >= 75 ? '✓ On Track' : '⚠ Below 75%'}
                </Text>
              </View>
            </View>

            {/* Big rate display */}
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 20 }}>
              <Text style={{ fontSize: 56, fontWeight: '800', color: C.text, letterSpacing: -2 }}>
                {stats.rate}
              </Text>
              <Text style={{ fontSize: 24, fontWeight: '700', color: C.textDim, marginLeft: 4 }}>%</Text>
            </View>

            {/* Progress bar */}
            <View style={{ height: 4, backgroundColor: C.cardElevated, borderRadius: 2, overflow: 'hidden', marginBottom: 20 }}>
              <View style={{
                height: 4, backgroundColor: C.text, borderRadius: 2,
                width: `${stats.rate}%`,
              }} />
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: C.border, marginBottom: 16 }} />

            {/* Stats row */}
            <View style={{ flexDirection: 'row', gap: 24 }}>
              <View>
                <Text style={{ fontSize: 10, color: C.textMuted, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Total
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, marginTop: 4 }}>
                  {stats.total}
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: C.border }} />
              <View>
                <Text style={{ fontSize: 10, color: C.textMuted, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Present
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, marginTop: 4 }}>
                  {stats.present}
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: C.border }} />
              <View>
                <Text style={{ fontSize: 10, color: C.textMuted, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Absent
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, marginTop: 4 }}>
                  {stats.absent}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Details Section */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            Personal Details
          </Text>

          <View style={{
            backgroundColor: C.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.border,
            overflow: 'hidden',
          }}>
            <DetailRow label="Roll Number" value={student?.roll_number} isLast={false} />
            <DetailRow label="Email" value={student?.email} isLast={false} />
            <DetailRow label="Department" value={student?.department} isLast={false} />
            <DetailRow label="Year" value={student?.year} isLast={false} />
            <DetailRow label="Semester" value={student?.semester} isLast={true} />
          </View>
        </View>

        {/* Settings Section */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            Preferences
          </Text>

          <View style={{
            backgroundColor: C.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.border,
            overflow: 'hidden',
          }}>
            <SettingRow
              icon="🔔"
              label="Notifications"
              subtitle="Session alerts and reminders"
              onPress={() => Alert.alert('Coming Soon', 'Notification settings will be available soon.')}
              isLast={false}
            />
            <SettingRow
              icon="🔒"
              label="Privacy"
              subtitle="Manage your data"
              onPress={() => Alert.alert('Coming Soon', 'Privacy settings will be available soon.')}
              isLast={false}
            />
            <SettingRow
              icon="ℹ️"
              label="About"
              subtitle="Version 1.0.0"
              onPress={() => Alert.alert('Presentsz', 'Version 1.0.0\n\nBLE-based attendance system\nBuilt with Expo & Go')}
              isLast={true}
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            Support
          </Text>

          <View style={{
            backgroundColor: C.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.border,
            overflow: 'hidden',
          }}>
            <SettingRow
              icon="💬"
              label="Help & Feedback"
              subtitle="Get help or report an issue"
              onPress={() => Alert.alert('Contact', 'Email: support@presentsz.com')}
              isLast={false}
            />
            <SettingRow
              icon="📄"
              label="Terms of Service"
              subtitle="Read our terms"
              onPress={() => Alert.alert('Coming Soon', 'Terms will be available soon.')}
              isLast={true}
            />
          </View>
        </View>

        {/* Sign Out Button */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              backgroundColor: C.card,
              borderRadius: 14, padding: 16,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: C.red,
              flexDirection: 'row', gap: 8,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.red }}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Info Footer */}
        <View style={{ paddingHorizontal: 20, marginTop: 24, alignItems: 'center' }}>
          <View style={{
            width: 32, height: 32, borderRadius: 8,
            backgroundColor: C.card,
            borderWidth: 1, borderColor: C.borderStrong,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 8,
          }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: C.text }}>P</Text>
          </View>
          <Text style={{ fontSize: 11, color: C.textMuted, fontWeight: '600' }}>
            Presentsz · v1.0.0
          </Text>
          <Text style={{ fontSize: 10, color: C.textFaint, marginTop: 4 }}>
            © 2026 All rights reserved
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Reusable Detail Row Component
const DetailRow = ({ label, value, isLast }: any) => (
  <View style={{
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: isLast ? 0 : 1,
    borderBottomColor: C.border,
  }}>
    <Text style={{ fontSize: 13, color: C.textDim, fontWeight: '500' }}>{label}</Text>
    <Text style={{ fontSize: 13, color: C.text, fontWeight: '600' }}>{value ?? '—'}</Text>
  </View>
);

// Reusable Setting Row Component
const SettingRow = ({ icon, label, subtitle, onPress, isLast }: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 14,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: C.border,
    }}
  >
    <View style={{
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: C.cardElevated,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: C.borderStrong,
    }}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{label}</Text>
      <Text style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>{subtitle}</Text>
    </View>
    <Text style={{ fontSize: 18, color: C.textMuted }}>›</Text>
  </TouchableOpacity>
);