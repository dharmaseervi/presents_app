import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getToken, getUserId } from '../lib/auth';
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

type AttendanceRecord = {
  session_id: string; subject: string; room_name: string;
  status: string; marked_at: string;
};

export default function HistoryScreen() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const token = await getToken();
      const userId = await getUserId();
      const res = await fetch(`${API}/students/${userId}/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setRecords(data.records ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); fetchHistory(); }, []);

  const fmt = (iso: string, type: 'date' | 'time') => {
    const d = new Date(iso);
    if (type === 'date') return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    if (type === 'time') return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return '';
  };

  const presentCount = records.filter(r => r.status === 'present').length;
  const absentCount = records.length - presentCount;
  const rate = records.length > 0 ? Math.round((presentCount / records.length) * 100) : 0;

  // Group records by month
  const groupedRecords = records.reduce((acc, record) => {
    const date = new Date(record.marked_at);
    const monthKey = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(record);
    return acc;
  }, {} as Record<string, AttendanceRecord[]>);

  const groupedArray = Object.entries(groupedRecords).map(([month, items]) => ({
    month,
    items: items.sort((a, b) => new Date(b.marked_at).getTime() - new Date(a.marked_at).getTime()),
  }));

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.text} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />
      <FlatList
        data={groupedArray}
        keyExtractor={item => item.month}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.text} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 20 }}>
            {/* Header */}
            <View style={{ paddingTop: 12, paddingBottom: 24 }}>
              <Text style={{ fontSize: 12, color: C.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: '600' }}>
                Records
              </Text>
              <Text style={{ fontSize: 28, fontWeight: '800', color: C.text, marginTop: 4, letterSpacing: -0.8 }}>
                History
              </Text>
              <Text style={{ fontSize: 13, color: C.textDim, marginTop: 4 }}>
                {records.length} {records.length === 1 ? 'session' : 'sessions'} recorded
              </Text>
            </View>

            {/* Summary Card */}
            {records.length > 0 && (
              <View style={{
                backgroundColor: C.card,
                borderRadius: 20,
                padding: 24,
                borderWidth: 1,
                borderColor: C.border,
                marginBottom: 24,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 11, color: C.textMuted, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
                    Overall Rate
                  </Text>
                  <View style={{
                    paddingHorizontal: 8, paddingVertical: 3,
                    backgroundColor: C.cardElevated,
                    borderWidth: 1, borderColor: C.borderStrong,
                    borderRadius: 6,
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: rate >= 75 ? C.text : C.textDim, letterSpacing: 0.3 }}>
                      {rate >= 75 ? '✓ On Track' : '⚠ Below 75%'}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={{ fontSize: 64, fontWeight: '800', color: C.text, letterSpacing: -3 }}>
                    {rate}
                  </Text>
                  <Text style={{ fontSize: 28, fontWeight: '700', color: C.textDim, marginLeft: 4 }}>%</Text>
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: C.border, marginTop: 20, marginBottom: 16 }} />

                {/* Stats row */}
                <View style={{ flexDirection: 'row', gap: 24 }}>
                  <View>
                    <Text style={{ fontSize: 10, color: C.textMuted, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                      Total
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, marginTop: 4 }}>
                      {records.length}
                    </Text>
                  </View>
                  <View style={{ width: 1, backgroundColor: C.border }} />
                  <View>
                    <Text style={{ fontSize: 10, color: C.textMuted, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                      Present
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, marginTop: 4 }}>
                      {presentCount}
                    </Text>
                  </View>
                  <View style={{ width: 1, backgroundColor: C.border }} />
                  <View>
                    <Text style={{ fontSize: 10, color: C.textMuted, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                      Absent
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, marginTop: 4 }}>
                      {absentCount}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {records.length > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5 }}>
                  Sessions
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 20 }}>
            <View style={{
              width: 56, height: 56, borderRadius: 16,
              backgroundColor: C.card,
              borderWidth: 1, borderColor: C.border,
              alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}>
              <Text style={{ fontSize: 24 }}>📋</Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>No Records Yet</Text>
            <Text style={{ fontSize: 12, color: C.textDim, marginTop: 4, textAlign: 'center' }}>
              Your attendance history will appear here
            </Text>
          </View>
        }
        renderItem={({ item: monthGroup }) => (
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            {/* Month Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{
                fontSize: 11, fontWeight: '700', color: C.textMuted,
                letterSpacing: 1, textTransform: 'uppercase',
              }}>
                {monthGroup.month}
              </Text>
              <Text style={{ fontSize: 11, color: C.textFaint }}>
                {monthGroup.items.length} {monthGroup.items.length === 1 ? 'record' : 'records'}
              </Text>
            </View>

            {/* Records Container */}
            <View style={{
              backgroundColor: C.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: C.border,
              overflow: 'hidden',
            }}>
              {monthGroup.items.map((record, i) => {
                const isLast = i === monthGroup.items.length - 1;
                const isPresent = record.status === 'present';

                return (
                  <View key={record.session_id + i} style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: C.border,
                  }}>
                    {/* Date Column */}
                    <View style={{ width: 48, alignItems: 'center' }}>
                      <Text style={{
                        fontSize: 20,
                        fontWeight: '800',
                        color: C.text,
                        letterSpacing: -0.5,
                      }}>
                        {new Date(record.marked_at).getDate()}
                      </Text>
                      <Text style={{
                        fontSize: 10,
                        fontWeight: '600',
                        color: C.textMuted,
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                        marginTop: 2,
                      }}>
                        {new Date(record.marked_at).toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 3)}
                      </Text>
                    </View>

                    {/* Vertical Divider */}
                    <View style={{
                      width: 1,
                      height: 40,
                      backgroundColor: C.border,
                      marginHorizontal: 16,
                    }} />

                    {/* Content */}
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 15,
                        fontWeight: '700',
                        color: C.text,
                        letterSpacing: -0.2,
                      }}>
                        {record.subject}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                        <Text style={{ fontSize: 11, color: C.textDim }}>
                          {record.room_name}
                        </Text>
                        <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: C.textFaint }} />
                        <Text style={{ fontSize: 11, color: C.textDim }}>
                          {fmt(record.marked_at, 'time')}
                        </Text>
                      </View>
                    </View>

                    {/* Status Badge */}
                    <View style={{
                      paddingHorizontal: 10, paddingVertical: 5,
                      backgroundColor: isPresent ? C.cardElevated : C.cardElevated,
                      borderWidth: 1,
                      borderColor: isPresent ? C.borderBright : C.red,
                      borderRadius: 8,
                    }}>
                      <Text style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: isPresent ? C.text : C.red,
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                      }}>
                        {record.status}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}