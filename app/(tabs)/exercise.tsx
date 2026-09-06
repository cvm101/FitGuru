import MyPlanView from '@/components/exercise/MyPlanView';
import ProgressChart from '@/components/exercise/ProgressChart';
import SplitCard from '@/components/exercise/SplitCard';
import WorkoutSession from '@/components/exercise/WorkoutSession';
import { useAuth } from '@/lib/context/AuthContext';
import { useTheme } from '@/lib/context/ThemeContext';
import { WORKOUT_SPLITS } from '@/lib/data/splits';
import {
  addWorkoutSets,
  createWorkoutSession,
  deleteWorkoutSession,
  getExerciseProgress,
  getWorkoutSessions,
} from '@/lib/queries/exercise';
import { clearActiveProgram, getActiveProgram, saveActiveProgram, restartProgramWeek } from '@/lib/activeProgram';
import type { ActiveExercise, WorkoutSplit, WorkoutSession as WorkoutSessionType } from '@/lib/types';
import exercisesData from '@/lib/data/exercises.json';
import type { Exercise } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import GlassPill from '@/components/ui/GlassPill';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Eyebrow from '@/components/ui/Eyebrow';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function usePressScale(to = 0.95) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return {
    style,
    onPressIn: () => { scale.value = withSpring(to, { damping: 15, stiffness: 300 }); },
    onPressOut: () => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); },
  };
}

function LogWorkoutButton({ onPress }: { onPress: () => void }) {
  const press = usePressScale();
  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
        press.style,
      ]}
    >
      <Ionicons name="add" size={16} color="white" />
      <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Log Workout</Text>
    </AnimatedTouchable>
  );
}

function TabBarButton({ tab, active, onPress }: { tab: { id: Tab; label: string; icon: string }; active: boolean; onPress: () => void }) {
  const press = usePressScale(0.92);
  const { colors } = useTheme();
  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        {
          flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          gap: 5, paddingVertical: 13,
          borderBottomWidth: 2.5,
          borderBottomColor: active ? '#059669' : 'transparent',
        },
        press.style,
      ]}
    >
      <Ionicons name={tab.icon as any} size={15} color={active ? '#059669' : colors.textMuted} />
      <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#059669' : colors.textMuted }}>{tab.label}</Text>
    </AnimatedTouchable>
  );
}

function LogFirstWorkoutButton({ onPress }: { onPress: () => void }) {
  const press = usePressScale();
  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[{ backgroundColor: '#059669', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 4 }, press.style]}
    >
      <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Log First Workout</Text>
    </AnimatedTouchable>
  );
}

function ExerciseChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const press = usePressScale();
  const { colors } = useTheme();
  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        {
          paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
          backgroundColor: active ? '#059669' : colors.card,
          borderWidth: 1.5, borderColor: active ? '#059669' : colors.border,
          shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
        },
        press.style,
      ]}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? 'white' : colors.textSub }}>{label}</Text>
    </AnimatedTouchable>
  );
}

type Tab = 'splits' | 'history' | 'progress' | 'plan';

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

function formatSessionDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ExerciseScreen() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const userId = session?.user.id ?? '';

  const [activeTab, setActiveTab] = useState<Tab>('splits');
  const [workoutVisible, setWorkoutVisible] = useState(false);
  const [activeSplit, setActiveSplit] = useState<WorkoutSplit | null>(null);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [activeProgramId, setActiveProgramId] = useState<string | null>(null);
  const [weekRestartAt, setWeekRestartAt] = useState<string | null>(null);
  const [exerciseOverride, setExerciseOverride] = useState<string[] | null>(null);
  const [initialExercisesOverride, setInitialExercisesOverride] = useState<ActiveExercise[] | null>(null);

  // Load persisted active program on mount
  useEffect(() => {
    getActiveProgram().then((p) => {
      if (p) {
        setActiveProgramId(p.splitId);
        setWeekRestartAt(p.weekRestartAt ?? null);
      }
    });
  }, []);

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
    setExerciseOverride(null);
    setInitialExercisesOverride(null);
    // Go back to My Plan tab if there's an active program, else History
    setActiveTab(activeProgramId ? 'plan' : 'history');
    Alert.alert('Workout Saved! 💪', `Great session! ${exercises.length} exercises logged.`);
  }

  function startWorkout(split?: WorkoutSplit, dayIdx?: number, exerciseList?: string[]) {
    setActiveSplit(split ?? null);
    setActiveDayIdx(dayIdx ?? 0);
    setExerciseOverride(exerciseList ?? null);
    setInitialExercisesOverride(null);
    setWorkoutVisible(true);
  }

  function continueWorkout(split: WorkoutSplit, dayIdx: number, previousSession: WorkoutSessionType) {
    const ALL_EXERCISES = exercisesData as Exercise[];

    // Build pre-filled exercises from the previous session's logged sets
    const grouped = new Map<string, typeof previousSession.workout_sets>();
    (previousSession.workout_sets ?? []).forEach((ws) => {
      if (!grouped.has(ws.exercise_name)) grouped.set(ws.exercise_name, []);
      grouped.get(ws.exercise_name)!.push(ws);
    });
    const prefilled: ActiveExercise[] = Array.from(grouped.entries()).map(([name, sets]) => {
      const found = ALL_EXERCISES.find((e) => e.name.toLowerCase() === name.toLowerCase());
      return {
        id: Math.random().toString(36).slice(2),
        name: found?.name ?? name,
        muscleGroup: found?.muscleGroup ?? (sets![0]?.muscle_group ?? 'General'),
        gifUrl: found?.gifUrl,
        thumbnailUrl: found?.thumbnailUrl,
        sets: (sets ?? [])
          .sort((a, b) => a.set_number - b.set_number)
          .map((ws) => ({
            id: Math.random().toString(36).slice(2),
            weight: ws.weight_kg?.toString() ?? '',
            reps: ws.reps?.toString() ?? '',
            rpe: '',
            done: false,
          })),
      };
    });

    // Append any exercises from the full split day that weren't logged yet
    const alreadyLogged = new Set(grouped.keys().map((k) => k.toLowerCase()));
    const splitDay = split.days[dayIdx];
    const remaining: ActiveExercise[] = (splitDay?.exercises ?? [])
      .filter((name) => !alreadyLogged.has(name.toLowerCase()))
      .map((name) => {
        const found = ALL_EXERCISES.find((e) => e.name.toLowerCase() === name.toLowerCase());
        return {
          id: Math.random().toString(36).slice(2),
          name: found?.name ?? name,
          muscleGroup: found?.muscleGroup ?? 'General',
          gifUrl: found?.gifUrl,
          thumbnailUrl: found?.thumbnailUrl,
          sets: [{ id: Math.random().toString(36).slice(2), weight: '', reps: '', rpe: '', done: false }],
        };
      });

    setActiveSplit(split);
    setActiveDayIdx(dayIdx);
    setExerciseOverride(null);
    setInitialExercisesOverride([...prefilled, ...remaining]);
    setWorkoutVisible(true);
  }

  async function handleFollowProgram(split: WorkoutSplit) {
    await saveActiveProgram(split.id);
    setActiveProgramId(split.id);
    setActiveTab('plan');
  }

  async function handleClearProgram() {
    await clearActiveProgram();
    setActiveProgramId(null);
    setWeekRestartAt(null);
    setActiveTab('splits');
  }

  async function handleRestartWeek() {
    if (!activeProgramId) return;
    await restartProgramWeek(activeProgramId);
    setWeekRestartAt(new Date().toISOString());
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchProgress()]);
    setRefreshing(false);
  }, [refetch, refetchProgress]);

  const [calc1RMWeight, setCalc1RMWeight] = useState('');
  const [calc1RMReps, setCalc1RMReps] = useState('');

  const trackedExercises = Array.from(new Set(sessions.flatMap((s) => s.workout_sets?.map((ws) => ws.exercise_name) ?? []))).slice(0, 12);
  const weekSessions = sessions.filter((s) => { const d = new Date(s.date); const now = new Date(); const ws = new Date(now); ws.setDate(ws.getDate() - 7); return d >= ws; }).length;

  const activeSplitObj = WORKOUT_SPLITS.find((s) => s.id === activeProgramId) ?? null;

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'plan', label: 'My Plan', icon: 'flag' },
    { id: 'splits', label: 'Programs', icon: 'grid' },
    { id: 'history', label: 'History', icon: 'time' },
    { id: 'progress', label: 'Progress', icon: 'trending-up' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" />
      {/* Dark header */}
      <ScreenHeader colors={colors.headerGradient} paddingBottom={20}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Train hard,</Text>
            <Text style={{ color: 'white', fontSize: 22, fontWeight: '800' }}>Exercise Tracker</Text>
          </View>
          <LogWorkoutButton onPress={() => startWorkout()} />
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { icon: 'barbell-outline', val: sessions.length, label: 'Total' },
            { icon: 'calendar-outline', val: weekSessions, label: 'This week' },
            { icon: 'fitness-outline', val: new Set(sessions.flatMap((s) => s.workout_sets?.map((ws) => ws.exercise_name) ?? [])).size, label: 'Exercises' },
          ].map((stat, i) => (
            <Animated.View key={stat.label} entering={FadeInDown.delay(i * 80).springify().damping(16)} style={{ flex: 1 }}>
              <GlassPill style={{ padding: 12, alignItems: 'center' }}>
                <Ionicons name={stat.icon as any} size={16} color="rgba(255,255,255,0.7)" />
                <AnimatedNumber value={stat.val} style={{ color: 'white', fontWeight: '800', fontSize: 18, marginTop: 4 }} />
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 1 }}>{stat.label}</Text>
              </GlassPill>
            </Animated.View>
          ))}
        </View>
      </ScreenHeader>

      {/* Tab bar */}
      <View style={{ flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.separator }}>
        {TABS.map((tab) => (
          <TabBarButton key={tab.id} tab={tab} active={activeTab === tab.id} onPress={() => setActiveTab(tab.id)} />
        ))}
      </View>

      {/* My Plan */}
      {activeTab === 'plan' && (
        activeSplitObj ? (
          <MyPlanView
            split={activeSplitObj}
            sessions={sessions}
            weekRestartAt={weekRestartAt ?? undefined}
            onStartDay={(split, dayIdx, exerciseList) => startWorkout(split, dayIdx, exerciseList)}
            onContinueDay={(split, dayIdx, prevSession) => continueWorkout(split, dayIdx, prevSession)}
            onChangeProgram={handleClearProgram}
            onRestartWeek={handleRestartWeek}
          />
        ) : (
          <ScrollView contentContainerStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 }}>
            <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="flag-outline" size={32} color="#059669" />
            </View>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18, textAlign: 'center' }}>No active program</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
              Go to Programs and tap "Follow This Program" to commit to a training split and track your weekly progress here.
            </Text>
            <TouchableOpacity
              onPress={() => setActiveTab('splits')}
              style={{ backgroundColor: '#059669', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 4 }}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Browse Programs</Text>
            </TouchableOpacity>
          </ScrollView>
        )
      )}

      {/* Splits */}
      {activeTab === 'splits' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16, lineHeight: 19 }}>
            Choose a program below to follow a structured training plan, or tap "Log Workout" to start a custom session.
          </Text>
          {WORKOUT_SPLITS.map((split, i) => (
            <Animated.View key={split.id} entering={FadeInDown.delay(Math.min(i, 6) * 60).springify().damping(16)}>
              <SplitCard
                split={split}
                onStartWorkout={(s, idx) => startWorkout(s, idx)}
                isActive={activeProgramId === split.id}
                onFollow={handleFollowProgram}
              />
            </Animated.View>
          ))}
        </ScrollView>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
          showsVerticalScrollIndicator={false}
        >
          {sessions.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="barbell-outline" size={32} color="#059669" />
              </View>
              <Text style={{ color: '#1E293B', fontWeight: '700', fontSize: 17 }}>No workouts yet</Text>
              <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', paddingHorizontal: 32 }}>Log your first workout to build a history and track your progress</Text>
              <LogFirstWorkoutButton onPress={() => startWorkout()} />
            </View>
          ) : (
            sessions.map((s, sessionIdx) => {
              const setCount = s.workout_sets?.length ?? 0;
              const exerciseSet = new Set(s.workout_sets?.map((ws) => ws.exercise_name));
              const totalVolume = (s.workout_sets ?? []).reduce((sum, ws) => sum + (ws.weight_kg ?? 0) * (ws.reps ?? 0), 0);
              return (
                <Animated.View key={s.id} entering={FadeInDown.delay(Math.min(sessionIdx, 6) * 60).springify().damping(16)} style={{ backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }} numberOfLines={1}>{s.split_name}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{formatSessionDate(s.date)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => Alert.alert('Delete', 'Remove this workout?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(s.id) }])}>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {[
                      { icon: 'barbell-outline', val: exerciseSet.size, suffix: '', label: 'exercises', color: '#059669' },
                      { icon: 'layers-outline', val: setCount, suffix: '', label: 'sets', color: '#3B82F6' },
                      { icon: 'time-outline', val: s.duration_minutes ?? 0, suffix: 'm', label: 'duration', color: '#10B981' },
                      { icon: 'trending-up-outline', val: Math.round(totalVolume), suffix: '', label: 'kg vol', color: '#F59E0B' },
                    ].map((stat) => (
                      <View key={stat.label} style={{ flex: 1, backgroundColor: stat.color + '12', borderRadius: 12, padding: 8, alignItems: 'center' }}>
                        <AnimatedNumber value={stat.val} suffix={stat.suffix} style={{ color: stat.color, fontWeight: '800', fontSize: 14 }} />
                        <Text style={{ color: colors.textMuted, fontSize: 9, marginTop: 2 }}>{stat.label}</Text>
                      </View>
                    ))}
                  </View>
                  {exerciseSet.size > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                      {Array.from(exerciseSet).map((ex) => (
                        <View key={ex} style={{ backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                          <Text style={{ color: colors.textSub, fontSize: 11 }}>{ex}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </Animated.View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Progress */}
      {activeTab === 'progress' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}>
          
          {/* 1RM Calculator */}
          <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 14, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 }}>
            <Eyebrow label="Tools" color="#059669" bg="#ECFDF5" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <View style={{ width: 32, height: 32, backgroundColor: '#ECFDF5', borderRadius: 11, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="calculator" size={16} color="#059669" />
              </View>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>1RM Calculator</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>One-Rep Max estimator</Text>
              </View>
            </View>

            {/* Explanation */}
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#059669' }}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 4 }}>What is 1RM?</Text>
              <Text style={{ color: colors.textSub, fontSize: 12, lineHeight: 18 }}>
                <Text style={{ fontWeight: '600' }}>1RM (One-Rep Max)</Text> is the maximum weight you can lift for a single repetition on an exercise — it's the gold standard for measuring strength.{'\n\n'}
                You don't need to actually attempt a dangerous max lift. Just enter a weight you recently lifted and the number of reps you did, and we'll estimate your 1RM using the <Text style={{ fontWeight: '600' }}>Epley formula</Text>. Works best with <Text style={{ color: '#059669', fontWeight: '600' }}>1–12 reps</Text>.{'\n\n'}
                The percentages below (60–100%) show how much weight to use for different training goals — e.g. 80% for hypertrophy (muscle building), 90%+ for strength work.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textSub, fontSize: 11, fontWeight: '600', marginBottom: 4 }}>Weight (kg)</Text>
                <TextInput
                  value={calc1RMWeight}
                  onChangeText={setCalc1RMWeight}
                  placeholder="e.g. 80"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  style={{ backgroundColor: colors.inputBg, borderWidth: 1.5, borderColor: colors.inputBorder, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontWeight: '600', color: colors.text }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textSub, fontSize: 11, fontWeight: '600', marginBottom: 4 }}>Reps</Text>
                <TextInput
                  value={calc1RMReps}
                  onChangeText={setCalc1RMReps}
                  placeholder="e.g. 5"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={{ backgroundColor: colors.inputBg, borderWidth: 1.5, borderColor: colors.inputBorder, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontWeight: '600', color: colors.text }}
                />
              </View>
            </View>
            {!!(calc1RMWeight && calc1RMReps) && (() => {
              const w = parseFloat(calc1RMWeight);
              const r = parseInt(calc1RMReps, 10);
              if (!w || !r || r < 1) return null;
              const orm = Math.round(w * (1 + r / 30));
                  const pcts = [
                    { p: 100, label: 'Max' },
                    { p: 90, label: 'Strength' },
                    { p: 80, label: 'Hypertrophy' },
                    { p: 70, label: 'Endurance' },
                    { p: 60, label: 'Warm-up' },
                  ];
                  return (
                    <Animated.View entering={FadeInDown.duration(300)} style={{ backgroundColor: '#ECFDF5', borderRadius: 14, padding: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}>
                        <AnimatedNumber value={orm} duration={400} style={{ color: '#059669', fontWeight: '900', fontSize: 28 }} />
                        <Text style={{ fontSize: 14, fontWeight: '400', color: '#34D399' }}> kg est. 1RM</Text>
                      </View>
                      <Text style={{ color: '#34D399', fontSize: 11, textAlign: 'center', marginTop: 2, marginBottom: 10 }}>Based on {w}kg × {r} reps (Epley formula)</Text>
                      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                        {pcts.map(({ p, label }) => (
                          <View key={p} style={{ flex: 1, minWidth: 56, backgroundColor: colors.card, borderRadius: 10, padding: 8, alignItems: 'center' }}>
                            <AnimatedNumber value={Math.round(orm * p / 100)} duration={400} style={{ color: '#059669', fontWeight: '800', fontSize: 14 }} />
                            <Text style={{ color: colors.textMuted, fontSize: 9, marginTop: 1 }}>{p}%</Text>
                            <Text style={{ color: colors.borderStrong, fontSize: 8, marginTop: 1 }}>{label}</Text>
                          </View>
                        ))}
                      </View>
                    </Animated.View>
                  );
            })()}
          </View>

          {trackedExercises.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 32, gap: 10 }}>
              <Ionicons name="trending-up-outline" size={40} color="#CBD5E1" />
              <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', paddingHorizontal: 32 }}>Log workouts with weights to see your strength progression here</Text>
            </View>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
                {trackedExercises.map((ex) => (
                  <ExerciseChip key={ex} label={ex} active={selectedExercise === ex} onPress={() => setSelectedExercise(ex)} />
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
              <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 16, marginTop: 14, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 }}>
                <Eyebrow label="Achievements" color="#D97706" bg="#FFFBEB" />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Ionicons name="trophy" size={18} color="#F59E0B" />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Personal Records</Text>
                </View>
                {trackedExercises.slice(0, 8).map((ex) => {
                  const allSets = sessions.flatMap((s) => s.workout_sets ?? []).filter((ws) => ws.exercise_name === ex && ws.weight_kg && ws.reps);
                  const maxWeight = Math.max(...allSets.map((ws) => ws.weight_kg ?? 0));
                  const bestSet = allSets.find((ws) => ws.weight_kg === maxWeight);
                  const est1RM = bestSet && bestSet.reps && bestSet.reps <= 12
                    ? Math.round(maxWeight * (1 + bestSet.reps / 30))
                    : null;
                  return maxWeight > 0 ? (
                    <View key={ex} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.separator }}>
                      <Text style={{ color: colors.textSub, fontSize: 13, flex: 1 }} numberOfLines={1}>{ex}</Text>
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        <View style={{ backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                          <Text style={{ color: '#D97706', fontWeight: '800', fontSize: 12 }}>🏆 {maxWeight}kg × {bestSet?.reps}</Text>
                        </View>
                        {est1RM && (
                          <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                            <Text style={{ color: '#059669', fontWeight: '700', fontSize: 11 }}>~{est1RM}kg 1RM</Text>
                          </View>
                        )}
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
        suggestedExercises={exerciseOverride ?? activeSplit?.days[activeDayIdx]?.exercises ?? []}
        initialExercises={initialExercisesOverride ?? undefined}
        onFinish={handleFinishWorkout}
        onClose={() => { setWorkoutVisible(false); setExerciseOverride(null); setInitialExercisesOverride(null); }}
      />
    </View>
  );
}
