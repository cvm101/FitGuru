import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StatusBar,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/lib/context/AuthContext';
import {
  getWorkoutSessions,
  createWorkoutSession,
  addWorkoutSets,
  deleteWorkoutSession,
  getExerciseProgress,
} from '@/lib/queries/exercise';
import SplitCard from '@/components/exercise/SplitCard';
import WorkoutSession from '@/components/exercise/WorkoutSession';
import ProgressChart from '@/components/exercise/ProgressChart';
import { WORKOUT_SPLITS } from '@/lib/data/splits';
import type { ActiveExercise, WorkoutSplit } from '@/lib/types';

type Tab = 'splits' | 'history' | 'progress';

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

function formatSessionDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ExerciseScreen() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const userId = session?.user.id ?? '';

  const [activeTab, setActiveTab] = useState<Tab>('splits');
  const [workoutVisible, setWorkoutVisible] = useState(false);
  const [activeSplit, setActiveSplit] = useState<WorkoutSplit | null>(null);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState('');

  const { data: sessions = [], refetch } = useQuery({
    queryKey: ['workout-sessions', userId],
    queryFn: () => getWorkoutSessions(userId),
    enabled: !!userId,
  });

  const { data: progressData = [], refetch: refetchProgress } = useQuery({
    queryKey: ['exercise-progress', userId, selectedExercise],
    queryFn: () => getExerciseProgress(userId, selectedExercise),
    enabled: !!userId && !!selectedExercise,
  });

  const createSessionMutation = useMutation({
    mutationFn: async ({ exercises, splitName, durationMinutes }: { exercises: ActiveExercise[]; splitName: string; durationMinutes: number }) => {
      const s = await createWorkoutSession({ user_id: userId, date: todayDate(), split_name: splitName, duration_minutes: durationMinutes, notes: null });
      const sets = exercises.flatMap((ex) =>
        ex.sets.filter((s) => s.reps || s.weight).map((s, idx) => ({
          session_id: s.id ? s.id : '',
          exercise_name: ex.name,
          muscle_group: ex.muscleGroup,
          set_number: idx + 1,
          reps: s.reps ? parseInt(s.reps, 10) : null,
          weight_kg: s.weight ? parseFloat(s.weight) : null,
          duration_sec: null,
        })).map((ws) => ({ ...ws, session_id: s.id }))
      );
      if (sets.length > 0) await addWorkoutSets(sets);
      return s;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workout-sessions', userId] }); qc.invalidateQueries({ queryKey: ['today-workout', userId] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkoutSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout-sessions', userId] }),
  });

  async function handleFinishWorkout(exercises: ActiveExercise[], durationMinutes: number) {
    const splitName = activeSplit ? `${activeSplit.name} – ${activeSplit.days[activeDayIdx]?.name ?? 'Day ' + (activeDayIdx + 1)}` : 'Custom Workout';
    await createSessionMutation.mutateAsync({ exercises, splitName, durationMinutes });
    setWorkoutVisible(false);
    setActiveSplit(null);
    setActiveTab('history');
    Alert.alert('Workout Saved! 💪', `Great session! ${exercises.length} exercises logged.`);
  }

  function startWorkout(split?: WorkoutSplit, dayIdx?: number) {
    setActiveSplit(split ?? null);
    setActiveDayIdx(dayIdx ?? 0);
    setWorkoutVisible(true);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchProgress()]);
    setRefreshing(false);
  }, [refetch, refetchProgress]);

  const trackedExercises = Array.from(new Set(sessions.flatMap((s) => s.workout_sets?.map((ws) => ws.exercise_name) ?? []))).slice(0, 12);
  const weekSessions = sessions.filter((s) => { const d = new Date(s.date); const now = new Date(); const ws = new Date(now); ws.setDate(ws.getDate() - 7); return d >= ws; }).length;

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'splits', label: 'Programs', icon: 'grid' },
    { id: 'history', label: 'History', icon: 'time' },
    { id: 'progress', label: 'Progress', icon: 'trending-up' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
      <StatusBar barStyle="light-content" />
      {/* Dark header */}
      <LinearGradient colors={['#1E1B4B', '#312E81', '#3730A3']} style={{ paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Train hard,</Text>
            <Text style={{ color: 'white', fontSize: 22, fontWeight: '800' }}>Exercise Tracker</Text>
          </View>
          <TouchableOpacity
            onPress={() => startWorkout()}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 }}
          >
            <Ionicons name="add" size={16} color="white" />
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Log Workout</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { icon: 'barbell-outline', val: sessions.length, label: 'Total' },
            { icon: 'calendar-outline', val: weekSessions, label: 'This week' },
            { icon: 'fitness-outline', val: new Set(sessions.flatMap((s) => s.workout_sets?.map((ws) => ws.exercise_name) ?? [])).size, label: 'Exercises' },
          ].map((stat) => (
            <View key={stat.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 12, alignItems: 'center' }}>
              <Ionicons name={stat.icon as any} size={16} color="rgba(255,255,255,0.7)" />
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 18, marginTop: 4 }}>{stat.val}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 1 }}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Tab bar */}
      <View style={{ flexDirection: 'row', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 5, paddingVertical: 13,
              borderBottomWidth: 2.5,
              borderBottomColor: activeTab === tab.id ? '#6366F1' : 'transparent',
            }}
          >
            <Ionicons name={tab.icon as any} size={15} color={activeTab === tab.id ? '#6366F1' : '#94A3B8'} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === tab.id ? '#6366F1' : '#94A3B8' }}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Splits */}
      {activeTab === 'splits' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          <Text style={{ color: '#64748B', fontSize: 13, marginBottom: 16, lineHeight: 19 }}>
            Choose a program below to follow a structured training plan, or tap "Log Workout" to start a custom session.
          </Text>
          {WORKOUT_SPLITS.map((split) => (
            <SplitCard key={split.id} split={split} onStartWorkout={(s, idx) => startWorkout(s, idx)} />
          ))}
        </ScrollView>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
          showsVerticalScrollIndicator={false}
        >
          {sessions.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="barbell-outline" size={32} color="#6366F1" />
              </View>
              <Text style={{ color: '#1E293B', fontWeight: '700', fontSize: 17 }}>No workouts yet</Text>
              <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', paddingHorizontal: 32 }}>Log your first workout to build a history and track your progress</Text>
              <TouchableOpacity onPress={() => startWorkout()} style={{ backgroundColor: '#6366F1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 4 }}>
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Log First Workout</Text>
              </TouchableOpacity>
            </View>
          ) : (
            sessions.map((s) => {
              const setCount = s.workout_sets?.length ?? 0;
              const exerciseSet = new Set(s.workout_sets?.map((ws) => ws.exercise_name));
              const totalVolume = (s.workout_sets ?? []).reduce((sum, ws) => sum + (ws.weight_kg ?? 0) * (ws.reps ?? 0), 0);
              return (
                <View key={s.id} style={{ backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ color: '#0F172A', fontWeight: '800', fontSize: 14 }} numberOfLines={1}>{s.split_name}</Text>
                      <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>{formatSessionDate(s.date)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => Alert.alert('Delete', 'Remove this workout?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(s.id) }])}>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {[
                      { icon: 'barbell-outline', val: exerciseSet.size, label: 'exercises', color: '#6366F1' },
                      { icon: 'layers-outline', val: setCount, label: 'sets', color: '#3B82F6' },
                      { icon: 'time-outline', val: `${s.duration_minutes ?? 0}m`, label: 'duration', color: '#10B981' },
                      { icon: 'trending-up-outline', val: Math.round(totalVolume), label: 'kg vol', color: '#F59E0B' },
                    ].map((stat) => (
                      <View key={stat.label} style={{ flex: 1, backgroundColor: stat.color + '12', borderRadius: 12, padding: 8, alignItems: 'center' }}>
                        <Text style={{ color: stat.color, fontWeight: '800', fontSize: 14 }}>{stat.val}</Text>
                        <Text style={{ color: '#94A3B8', fontSize: 9, marginTop: 2 }}>{stat.label}</Text>
                      </View>
                    ))}
                  </View>
                  {exerciseSet.size > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                      {Array.from(exerciseSet).map((ex) => (
                        <View key={ex} style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                          <Text style={{ color: '#64748B', fontSize: 11 }}>{ex}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Progress */}
      {activeTab === 'progress' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}>
          {trackedExercises.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 10 }}>
              <Ionicons name="trending-up-outline" size={40} color="#CBD5E1" />
              <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', paddingHorizontal: 32 }}>Log workouts with weights to see your strength progression here</Text>
            </View>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
                {trackedExercises.map((ex) => (
                  <TouchableOpacity
                    key={ex}
                    onPress={() => setSelectedExercise(ex)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
                      backgroundColor: selectedExercise === ex ? '#6366F1' : 'white',
                      borderWidth: 1.5, borderColor: selectedExercise === ex ? '#6366F1' : '#E2E8F0',
                      shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: selectedExercise === ex ? 'white' : '#475569' }}>{ex}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {selectedExercise ? (
                <ProgressChart data={progressData} exerciseName={selectedExercise} />
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
                  <Ionicons name="analytics-outline" size={32} color="#CBD5E1" />
                  <Text style={{ color: '#94A3B8', fontSize: 13 }}>Select an exercise to see progress</Text>
                </View>
              )}

              {/* PRs */}
              <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 16, marginTop: 16, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Ionicons name="trophy" size={18} color="#F59E0B" />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>Personal Records</Text>
                </View>
                {trackedExercises.slice(0, 8).map((ex) => {
                  const maxWeight = Math.max(...sessions.flatMap((s) => s.workout_sets ?? []).filter((ws) => ws.exercise_name === ex && ws.weight_kg).map((ws) => ws.weight_kg ?? 0));
                  return maxWeight > 0 ? (
                    <View key={ex} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' }}>
                      <Text style={{ color: '#475569', fontSize: 13, flex: 1 }} numberOfLines={1}>{ex}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                        <Ionicons name="trophy" size={12} color="#F59E0B" />
                        <Text style={{ color: '#D97706', fontWeight: '800', fontSize: 13 }}>{maxWeight}kg</Text>
                      </View>
                    </View>
                  ) : null;
                })}
              </View>
            </>
          )}
        </ScrollView>
      )}

      <WorkoutSession
        visible={workoutVisible}
        splitName={activeSplit ? `${activeSplit.shortName} – ${activeSplit.days[activeDayIdx]?.name ?? 'Day ' + (activeDayIdx + 1)}` : 'Custom Workout'}
        suggestedExercises={activeSplit?.days[activeDayIdx]?.exercises ?? []}
        onFinish={handleFinishWorkout}
        onClose={() => setWorkoutVisible(false)}
      />
    </View>
  );
}
