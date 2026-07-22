import { useEffect, useRef, useState } from 'react';
import {
    View, Text, TouchableOpacity,
    ActivityIndicator, ScrollView,
    Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getToken, getUserId, clearToken } from '../lib/auth';
import { checkBLEAvailable, startBLEFlow } from '../lib/ble';
import { API } from '../lib/config';
import { useAttendanceState } from '../lib/useAttendanceState';
import React from 'react';

const POLL_INTERVAL = 5000;

const C = {
    // Layered blacks
    bg: '#000000',
    card: '#0A0A0A',
    cardElevated: '#141414',
    cardHover: '#1A1A1A',

    // Borders
    border: '#1A1A1A',
    borderStrong: '#2A2A2A',
    borderBright: '#3F3F46',

    // Text
    text: '#FFFFFF',
    textDim: '#A1A1AA',
    textMuted: '#52525B',
    textFaint: '#27272A',

    // Semantic (minimal use)
    green: '#22C55E',
    red: '#EF4444',
};

type Session = {
    active: boolean;
    session_id?: string;
    subject?: string;
    room_name?: string;
    end_time?: string;
    already_marked?: boolean;
};

type Student = {
    id: string; name: string; roll_number: string;
    year: string; semester: string; department: string; email: string;
    section?: string; // ← add this
};

type TimetableEntry = {
    id: string; time_slot: string; subject: string; room_name: string;
};

export default function HomeScreen() {
    const [student, setStudent] = useState<Student | null>(null);
    const [session, setSession] = useState<Session>({ active: false });
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [presentCount, setPresentCount] = useState(0);
    const [totalCount, setTotalCount] = useState(20);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ present: 0, absent: 0, rate: 0 });
    const [refreshing, setRefreshing] = useState(false);

    const attendance = useAttendanceState();
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const bleCleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => { fetchProfile(); }, []);

    useEffect(() => {
        if (!student) return;
        pollSession();
        fetchTodayTimetable();
        pollRef.current = setInterval(pollSession, POLL_INTERVAL);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            if (bleCleanupRef.current) bleCleanupRef.current();
        };
    }, [student]);

    useEffect(() => {
        if (!session.session_id) {
            attendance.reset();
            return;
        }
        if (session.already_marked) {
            attendance.markAlreadyMarked();
        } else if (attendance.status === 'already_marked') {
            attendance.reset();
        }
    }, [session.session_id, session.already_marked]);

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
        finally { setLoading(false); }
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
                setStats({ present, absent: total - present, rate });
            }
        } catch (e) { console.error(e); }
    };

    const fetchTodayTimetable = async () => {
        try {
            const token = await getToken();
            const today = new Date().toISOString().split('T')[0];
            const year = student?.year ?? '1st Year';
            const res = await fetch(
                `${API}/timetable?date=${today}&year=${encodeURIComponent(year)}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await res.json();
            if (res.ok) {
                let entries = Array.isArray(data) ? data : data.entries ?? data.timetable ?? [];
                setTimetable(entries);
            }
        } catch (e) { console.error(e); }
    };

    const pollSession = async () => {
        try {
            const token = await getToken();
            const res = await fetch(
                `${API}/sessions/active?section=${encodeURIComponent(student?.section ?? '')}&semester=${encodeURIComponent(student?.semester ?? '')}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await res.json();
            console.log('SESSION POLL RESULT:', JSON.stringify(data)); // ← temp
            setSession(data);
            if (data.already_marked) attendance.markAlreadyMarked();
            else if (!data.active) attendance.reset();

            if (data.active && data.session_id) {
                const r = await fetch(`${API}/sessions/${data.session_id}/attendance-count`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const d = await r.json();
                if (r.ok) setPresentCount(d.count ?? 0);
            }
            if (data.active && data.room_name) {
                const r = await fetch(`${API}/classrooms/${data.room_name}/count`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const d = await r.json();
                if (r.ok && d.count) setTotalCount(d.count);
            }
        } catch (e) { console.error(e); }
    }

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([pollSession(), fetchTodayTimetable()]);
        } finally { setRefreshing(false); }
    };

    const markAttendance = async () => {
        if (!session.session_id) return;
        if (session.already_marked || attendance.status === 'already_marked') {
            Alert.alert("Already Marked", "You've already marked attendance for this session.");
            return;
        }
        const bleAvailable = await checkBLEAvailable();
        if (!bleAvailable) {
            Alert.alert("Bluetooth OFF", "Please turn on Bluetooth to mark attendance via ESP32.");
            return;
        }
        attendance.markSuccess();
        try {
            const cleanup = await startBLEFlow(
                session.session_id, API,
                () => {
                    if (pollRef.current) clearInterval(pollRef.current);
                    attendance.markSuccess();
                },
                (err: any) => {
                    if (err.message.includes('already marked')) attendance.markAlreadyMarked();
                    else { attendance.markError(); Alert.alert('Error', err.message); }
                }
            );
            bleCleanupRef.current = cleanup;
        } catch (e: any) {
            attendance.markError();
            Alert.alert('Error', e?.message || 'Failed');
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={C.text} size="large" />
            </SafeAreaView>
        );
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const sorted = [...timetable].sort((a, b) => a.time_slot.localeCompare(b.time_slot));
    const currentSlotIndex = sorted.findIndex((s, i) => {
        const end = sorted[i + 1]?.time_slot ?? '23:59';
        return currentTime >= s.time_slot && currentTime < end;
    });
    const firstName = student?.name.split(' ')[0] ?? '';
    const initials = student?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '';
    const progressPct = totalCount > 0 ? Math.min(Math.round((presentCount / totalCount) * 100), 100) : 0;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar style="light" />
            <ScrollView
                contentContainerStyle={{ paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.text} />
                }
            >
                {/* Header */}
                <View style={{
                    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <View>
                        <Text style={{ fontSize: 12, color: C.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: '600' }}>
                            Welcome back
                        </Text>
                        <Text style={{ fontSize: 28, fontWeight: '800', color: C.text, marginTop: 4, letterSpacing: -0.8 }}>
                            {firstName}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/profile')} style={{
                        width: 44, height: 44, borderRadius: 22,
                        backgroundColor: C.cardElevated,
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: 1, borderColor: C.borderStrong,
                    }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{initials}</Text>
                    </TouchableOpacity>
                </View>

                {/* Big Attendance Card */}
                <View style={{ paddingHorizontal: 20 }}>
                    <View style={{
                        backgroundColor: C.card,
                        borderRadius: 20,
                        padding: 24,
                        borderWidth: 1,
                        borderColor: C.border,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ fontSize: 11, color: C.textMuted, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
                                Attendance Rate
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

                        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 12 }}>
                            <Text style={{ fontSize: 64, fontWeight: '800', color: C.text, letterSpacing: -3 }}>
                                {stats.rate}
                            </Text>
                            <Text style={{ fontSize: 28, fontWeight: '700', color: C.textDim, marginLeft: 4 }}>%</Text>
                        </View>

                        {/* Divider */}
                        <View style={{ height: 1, backgroundColor: C.border, marginTop: 20, marginBottom: 16 }} />

                        {/* Stats row */}
                        <View style={{ flexDirection: 'row', gap: 24 }}>
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
                            <View style={{ width: 1, backgroundColor: C.border }} />
                            <View>
                                <Text style={{ fontSize: 10, color: C.textMuted, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                    Total
                                </Text>
                                <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, marginTop: 4 }}>
                                    {stats.present + stats.absent}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Live Session Card */}
                {session.active && (
                    <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
                        <View style={{
                            backgroundColor: C.card,
                            borderRadius: 20,
                            padding: 20,
                            borderWidth: 1,
                            borderColor: C.borderBright,
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={{ position: 'relative' }}>
                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.red }} />
                                    </View>
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: C.text, letterSpacing: 1.5 }}>
                                        LIVE SESSION
                                    </Text>
                                </View>
                                {session.end_time && (
                                    <Text style={{ fontSize: 11, color: C.textMuted, fontWeight: '600' }}>
                                        Ends {new Date(session.end_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                )}
                            </View>

                            <Text style={{ fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.8 }}>
                                {session.subject}
                            </Text>
                            <Text style={{ fontSize: 13, color: C.textDim, marginTop: 4, fontWeight: '500' }}>
                                Room {session.room_name}
                            </Text>

                            {/* Progress */}
                            <View style={{ marginTop: 20 }}>
                                <View style={{ height: 4, backgroundColor: C.cardElevated, borderRadius: 2, overflow: 'hidden' }}>
                                    <View style={{
                                        height: 4, backgroundColor: C.text, borderRadius: 2,
                                        width: `${progressPct}%`,
                                    }} />
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                                    <Text style={{ fontSize: 11, color: C.textDim, fontWeight: '600' }}>
                                        {presentCount} of {totalCount} students
                                    </Text>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: C.text }}>{progressPct}%</Text>
                                </View>
                            </View>

                            {/* Action */}
                            <View style={{ marginTop: 20 }}>
                                {attendance.status === 'success' || attendance.status === 'already_marked' ? (
                                    <View style={{
                                        backgroundColor: C.cardElevated,
                                        borderRadius: 12, padding: 16,
                                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                                        borderWidth: 1, borderColor: C.borderBright,
                                    }}>
                                        <View style={{
                                            width: 20, height: 20, borderRadius: 10,
                                            backgroundColor: C.text,
                                            alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Text style={{ fontSize: 12, color: C.bg, fontWeight: '800' }}>✓</Text>
                                        </View>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>
                                            Attendance Marked
                                        </Text>
                                    </View>
                                ) : attendance.status === 'error' ? (
                                    <TouchableOpacity onPress={markAttendance} style={{
                                        backgroundColor: C.cardElevated,
                                        borderRadius: 12, padding: 16,
                                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        borderWidth: 1, borderColor: C.red,
                                    }}>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: C.red }}>
                                            Retry — ESP32 Not Found
                                        </Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        onPress={markAttendance}
                                        disabled={attendance.isLoading}
                                        style={{
                                            backgroundColor: C.text,
                                            borderRadius: 12, padding: 16,
                                            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                                            opacity: attendance.isLoading ? 0.5 : 1,
                                        }}
                                    >
                                        {attendance.isLoading ? (
                                            <>
                                                <ActivityIndicator color={C.bg} size="small" />
                                                <Text style={{ fontSize: 15, fontWeight: '700', color: C.bg }}>Scanning BLE...</Text>
                                            </>
                                        ) : (
                                            <Text style={{ fontSize: 15, fontWeight: '700', color: C.bg }}>
                                                Mark Attendance
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                )}

                {/* No active session */}
                {!session.active && (
                    <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
                        <View style={{
                            backgroundColor: C.card, borderRadius: 16, padding: 20,
                            borderWidth: 1, borderColor: C.border,
                            flexDirection: 'row', alignItems: 'center', gap: 14,
                        }}>
                            <View style={{
                                width: 44, height: 44, borderRadius: 12,
                                backgroundColor: C.cardElevated,
                                alignItems: 'center', justifyContent: 'center',
                                borderWidth: 1, borderColor: C.borderStrong,
                            }}>
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.textMuted }} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>No Active Session</Text>
                                <Text style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>Waiting for teacher to start</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Schedule Section */}
                <View style={{ paddingHorizontal: 20, marginTop: 32 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <View>
                            <Text style={{ fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5 }}>Today</Text>
                            <Text style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>
                                {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </Text>
                        </View>
                        <View style={{
                            paddingHorizontal: 10, paddingVertical: 5,
                            backgroundColor: C.cardElevated, borderRadius: 8,
                            borderWidth: 1, borderColor: C.borderStrong,
                        }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: C.text }}>
                                {sorted.length} {sorted.length === 1 ? 'class' : 'classes'}
                            </Text>
                        </View>
                    </View>

                    {sorted.length === 0 ? (
                        <View style={{
                            backgroundColor: C.card, borderRadius: 16, padding: 32,
                            borderWidth: 1, borderColor: C.border, alignItems: 'center',
                        }}>
                            <View style={{
                                width: 48, height: 48, borderRadius: 24,
                                backgroundColor: C.cardElevated,
                                alignItems: 'center', justifyContent: 'center',
                                marginBottom: 12,
                            }}>
                                <Text style={{ fontSize: 20 }}>📅</Text>
                            </View>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>No Classes Today</Text>
                            <Text style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>Enjoy your day off</Text>
                        </View>
                    ) : (
                        <View style={{
                            backgroundColor: C.card,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: C.border,
                            overflow: 'hidden',
                        }}>
                            {sorted.map((entry, i) => {
                                const isCurrent = i === currentSlotIndex;
                                const isPast = i < currentSlotIndex;
                                const isNext = i === currentSlotIndex + 1;
                                const isLast = i === sorted.length - 1;

                                return (
                                    <View key={entry.id} style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        padding: 16,
                                        backgroundColor: isCurrent ? C.cardElevated : 'transparent',
                                        borderBottomWidth: isLast ? 0 : 1,
                                        borderBottomColor: C.border,
                                    }}>
                                        {/* Time */}
                                        <View style={{ width: 52 }}>
                                            <Text style={{
                                                fontSize: 13,
                                                fontWeight: '700',
                                                color: isCurrent ? C.text : isPast ? C.textFaint : C.textDim,
                                                letterSpacing: -0.2,
                                            }}>
                                                {entry.time_slot}
                                            </Text>
                                        </View>

                                        {/* Timeline indicator */}
                                        <View style={{ marginRight: 16, alignItems: 'center' }}>
                                            <View style={{
                                                width: isCurrent ? 8 : 6,
                                                height: isCurrent ? 8 : 6,
                                                borderRadius: 4,
                                                backgroundColor: isCurrent ? C.text : isPast ? C.textFaint : C.borderStrong,
                                            }} />
                                        </View>

                                        {/* Content */}
                                        <View style={{ flex: 1 }}>
                                            <Text style={{
                                                fontSize: 15,
                                                fontWeight: isCurrent ? '700' : '600',
                                                color: isPast ? C.textFaint : C.text,
                                                letterSpacing: -0.2,
                                            }}>
                                                {entry.subject}
                                            </Text>
                                            <Text style={{
                                                fontSize: 12,
                                                color: isPast ? C.textFaint : C.textDim,
                                                marginTop: 2,
                                            }}>
                                                Room {entry.room_name}
                                            </Text>
                                        </View>

                                        {/* Badge */}
                                        {isCurrent && (
                                            <View style={{
                                                paddingHorizontal: 8, paddingVertical: 4,
                                                backgroundColor: C.text, borderRadius: 6,
                                            }}>
                                                <Text style={{ fontSize: 10, fontWeight: '800', color: C.bg, letterSpacing: 0.8 }}>
                                                    NOW
                                                </Text>
                                            </View>
                                        )}
                                        {isNext && (
                                            <View style={{
                                                paddingHorizontal: 8, paddingVertical: 4,
                                                backgroundColor: C.cardElevated,
                                                borderWidth: 1, borderColor: C.borderStrong,
                                                borderRadius: 6,
                                            }}>
                                                <Text style={{ fontSize: 10, fontWeight: '700', color: C.textDim, letterSpacing: 0.5 }}>
                                                    NEXT
                                                </Text>
                                            </View>
                                        )}
                                        {isPast && (
                                            <View style={{
                                                width: 20, height: 20, borderRadius: 10,
                                                borderWidth: 1, borderColor: C.textFaint,
                                                alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <Text style={{ fontSize: 10, color: C.textFaint }}>✓</Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* User info footer */}
                <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
                    <View style={{
                        backgroundColor: C.card, borderRadius: 12, padding: 14,
                        borderWidth: 1, borderColor: C.border,
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                    }}>
                        <View style={{
                            width: 4, height: 32, borderRadius: 2,
                            backgroundColor: C.text,
                        }} />
                        <View>
                            <Text style={{ fontSize: 12, color: C.textDim, fontWeight: '600' }}>
                                {student?.department} · {student?.year}
                            </Text>
                            <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                                {student?.roll_number}
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}