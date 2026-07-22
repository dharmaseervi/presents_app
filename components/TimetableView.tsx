import { View, Text, ScrollView } from 'react-native';
import React from 'react';

type TimeSlot = {
  id: string;
  time_slot: string;
  subject: string;
  room_name: string;
};

type Props = {
  timetable: TimeSlot[];
};

const C = {
  bg: '#111117',
  surface: '#161620',
  text: '#F0F0FF',
  textMuted: '#C0C0E0',
  teal: '#4ECCA3',
  purple: '#8888CC',
  red: '#FF6B6B',
};

export function TimetableView({ timetable }: Props) {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const sorted = [...timetable].sort((a, b) => a.time_slot.localeCompare(b.time_slot));

  const getStatus = (timeSlot: string) => {
    const nextIndex = sorted.findIndex(s => s.time_slot >= currentTime);
    const currentIndex = nextIndex > 0 ? nextIndex - 1 : -1;

    const classIndex = sorted.findIndex(s => s.time_slot === timeSlot);

    if (classIndex === currentIndex) return 'current';
    if (classIndex === nextIndex) return 'next';
    if (classIndex < currentIndex) return 'done';
    return 'upcoming';
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ gap: 8 }}>
      {sorted.map((entry, idx) => {
        const status = getStatus(entry.time_slot);
        const isFirst = status === 'current';

        const bgColor = status === 'current' ? '#16162A' : status === 'next' ? '#1A1A28' : C.surface;
        const borderColor = status === 'current' ? C.purple : status === 'next' ? C.teal : '#2A2A40';
        const timeColor = status === 'current' ? C.purple : status === 'done' ? C.textMuted : C.text;

        const statusLabel = status === 'current' ? '🔴 NOW' : status === 'done' ? '✓ Done' : status === 'next' ? '⏭ Next' : '⏳ Later';
        const statusColor = status === 'current' ? C.red : status === 'done' ? C.teal : C.textMuted;

        return (
          <View
            key={entry.id}
            style={{
              backgroundColor: bgColor,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: borderColor,
              padding: 14,
              marginBottom: isFirst ? 8 : 0,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, letterSpacing: -0.5 }}>
                  {entry.subject}
                </Text>
                <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                  {entry.room_name}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: timeColor }}>
                  {entry.time_slot}
                </Text>
                <Text style={{ fontSize: 10, color: statusColor, fontWeight: '700', marginTop: 2 }}>
                  {statusLabel}
                </Text>
              </View>
            </View>

            {status === 'current' && (
              <View style={{ backgroundColor: '#200D0D', borderRadius: 8, padding: 8, marginTop: 8, borderWidth: 1, borderColor: '#4A1A1A' }}>
                <Text style={{ fontSize: 11, color: C.red, fontWeight: '600' }}>
                  🔴 Class in progress — Mark attendance available
                </Text>
              </View>
            )}

            {status === 'next' && (
              <View style={{ backgroundColor: '#0D1E18', borderRadius: 8, padding: 8, marginTop: 8, borderWidth: 1, borderColor: '#1A4A3A' }}>
                <Text style={{ fontSize: 11, color: C.teal, fontWeight: '600' }}>
                  ⏭ Coming up next
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}