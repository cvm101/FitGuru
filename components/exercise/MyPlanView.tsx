// MyPlanView — active program tracker with weekly checklist
import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { WorkoutSplit, WorkoutSession } from '@/lib/types';
import { useTheme } from '@/lib/context/ThemeContext';

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

/** Monday of the current week at midnight */
function getWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function findSessionForDay(split: WorkoutSplit, dayName: string, sessions: WorkoutSession[]): WorkoutSession | undefined {
  return sessions.find(
    (s) => s.split_name.includes(split.name) && s.split_name.includes(`– ${dayName}`)
  );
}

interface Props {
  split: WorkoutSplit;
  sessions: WorkoutSession[];
  weekRestartAt?: string; // ISO timestamp — sessions before this are excluded
  onStartDay: (split: WorkoutSplit, dayIdx: number, exerciseOverride?: string[]) => void;
  onContinueDay: (split: WorkoutSplit, dayIdx: number, previousSession: WorkoutSession) => void;
  onChangeProgram: () => void;
  onRestartWeek: () => void;
}

export default function MyPlanView({ split, sessions, weekRestartAt, onStartDay, onContinueDay, onChangeProgram, onRestartWeek }: Props) {
  const { colors } = useTheme();
  const weekStart = getWeekStart();

  // Sessions count as "this week" only if they're after the week reset AND after any manual restart
  const restartCutoff = weekRestartAt ? new Date(weekRestartAt) : null;
  const thisWeekSessions = sessions.filter((s) => {
    const sessionDate = new Date(s.date + 'T00:00:00');
    if (sessionDate < weekStart) return false;
    // If user hit Restart, only count sessions created after the restart timestamp
    if (restartCutoff && new Date(s.created_at) <= restartCutoff) return false;
    return true;
  });

  const dayStatuses = split.days.map((day, idx) => {
    const previousSession = findSessionForDay(split, day.name, thisWeekSessions);
    return {
      day,
      idx,
      done: !!previousSession,
      previousSession,
    };
  });

  const nextUp = dayStatuses.find((d) => !d.done);
  const allDone = dayStatuses.every((d) => d.done);
  const doneCount = dayStatuses.filter((d) => d.done).length;
  const totalDays = split.days.length;

  const changePress = usePressScale();
  const restartPress = usePressScale(0.96);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Program header ───────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(0).springify().damping(16)}>
        <View style={{
          backgroundColor: '#1E293B',
          borderRadius: 20,
          padding: 18,
          marginBottom: 14,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 5,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Ionicons name="flag" size={14} color="#10B981" />
                <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Active Program
                </Text>
              </View>
              <Text style={{ color: 'white', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 }}>{split.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.55)" />
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>{split.frequency}</Text>
              </View>
            </View>

            <AnimatedTouchable
              onPress={onChangeProgram}
              onPressIn={changePress.onPressIn}
              onPressOut={changePress.onPressOut}
              style={[{
                backgroundColor: 'rgba(255,255,255,0.12)',
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 11,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
              }, changePress.style]}
            >
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' }}>Change</Text>
            </AnimatedTouchable>
          </View>

          {/* Week progress */}
          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>This week</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 }}>{doneCount}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '600' }}>/{totalDays}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginLeft: 3 }}>days</Text>
              </View>
            </View>
            <View style={{ height: 7, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 4, overflow: 'hidden' }}>
              <View style={{
                height: 7,
                borderRadius: 4,
                backgroundColor: allDone ? '#F59E0B' : '#10B981',
                width: `${totalDays > 0 ? (doneCount / totalDays) * 100 : 0}%`,
              }} />
            </View>
            {/* Per-day dot row */}
            <View style={{ flexDirection: 'row', gap: 5, marginTop: 8 }}>
              {dayStatuses.map(({ done }, i) => (
                <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: done ? '#10B981' : 'rgba(255,255,255,0.15)' }} />
              ))}
            </View>
          </View>

          {/* Restart Week button */}
          <AnimatedTouchable
            onPress={onRestartWeek}
            onPressIn={restartPress.onPressIn}
            onPressOut={restartPress.onPressOut}
            style={[{
              marginTop: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 9,
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.15)',
            }, restartPress.style]}
          >
            <Ionicons name="refresh-outline" size={14} color="rgba(255,255,255,0.6)" />
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' }}>
              Restart Week
            </Text>
          </AnimatedTouchable>
        </View>
      </Animated.View>

      {/* ── Next Up / Week Complete card ─────────────────────── */}
      <Animated.View entering={FadeInDown.delay(60).springify().damping(16)}>
        {allDone ? (
          <WeekCompleteCard doneCount={doneCount} totalDays={totalDays} />
        ) : nextUp ? (
          <NextUpCard
            split={split}
            dayStatus={nextUp}
            onStart={() => onStartDay(split, nextUp.idx)}
          />
        ) : null}
      </Animated.View>

      {/* ── Day checklist ─────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(120).springify().damping(16)}>
    <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
                      Weekly Checklist · {doneCount}/{totalDays} complete
                    </Text>
                    <View style={{
                      backgroundColor: colors.card,
                      borderRadius: 20,
                      overflow: 'hidden',
                      shadowColor: '#0F172A',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.07,
                      shadowRadius: 8,
                      elevation: 3,
                    }}>
          {dayStatuses.map(({ day, idx, done, previousSession }, i) => (
            <DayRow
              key={idx}
              split={split}
              dayName={day.name}
              muscles={day.muscles}
              exercises={day.exercises}
              dayNum={idx + 1}
              done={done}
              previousSession={previousSession}
              isLast={i === dayStatuses.length - 1}
              onStart={() => onStartDay(split, idx)}
              onRepeat={() => onStartDay(split, idx, day.exercises)}
              onContinue={() => previousSession && onContinueDay(split, idx, previousSession)}
            />
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

// ─── Week Complete card ───────────────────────────────────────────────────────

function WeekCompleteCard({ doneCount, totalDays }: { doneCount: number; totalDays: number }) {
  return (
    <View style={{
      backgroundColor: '#ECFDF5',
      borderRadius: 18,
      padding: 20,
      marginBottom: 14,
      alignItems: 'center',
      gap: 8,
      borderWidth: 1.5,
      borderColor: '#A7F3D0',
    }}>
      <Ionicons name="trophy" size={36} color="#059669" />
      <Text style={{ color: '#059669', fontSize: 20, fontWeight: '900', letterSpacing: -0.3 }}>Week Complete!</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 2 }}>
        <Text style={{ color: '#059669', fontSize: 42, fontWeight: '900', letterSpacing: -1 }}>{doneCount}</Text>
        <Text style={{ color: '#34D399', fontSize: 24, fontWeight: '700' }}>/{totalDays}</Text>
        <Text style={{ color: '#34D399', fontSize: 15, marginLeft: 4, fontWeight: '600' }}>sessions</Text>
      </View>
      <Text style={{ color: '#34D399', fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
        You crushed every session this week!{'\n'}Checkmarks reset on Monday.
      </Text>
    </View>
  );
}

// ─── Next Up card ─────────────────────────────────────────────────────────────

interface NextUpCardProps {
  split: WorkoutSplit;
  dayStatus: { day: { name: string; muscles: string[]; exercises: string[] }; idx: number };
  onStart: () => void;
}

function NextUpCard({ split, dayStatus, onStart }: NextUpCardProps) {
  const press = usePressScale();
  const { colors } = useTheme();
  const { day } = dayStatus;

  return (
    <View style={{
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      marginBottom: 14,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 3,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
        <Text style={{ color: '#475569', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Next Up</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: split.color + '18', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: split.color, fontSize: 13, fontWeight: '800' }}>{dayStatus.idx + 1}</Text>
            </View>
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>{day.name}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
            {day.muscles.map((m) => (
              <View key={m} style={{ backgroundColor: split.color + '14', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ color: split.color, fontSize: 11, fontWeight: '600' }}>{m}</Text>
              </View>
            ))}
          </View>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                        {day.exercises.length} exercises
                      </Text>
        </View>

        <AnimatedTouchable
          onPress={onStart}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
          style={[{ backgroundColor: '#059669', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, alignItems: 'center', gap: 4 }, press.style]}
        >
          <Ionicons name="play" size={16} color="white" />
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>Start</Text>
        </AnimatedTouchable>
      </View>
    </View>
  );
}

// ─── Day row ──────────────────────────────────────────────────────────────────

interface DayRowProps {
  split: WorkoutSplit;
  dayName: string;
  muscles: string[];
  exercises: string[];
  dayNum: number;
  done: boolean;
  previousSession: WorkoutSession | undefined;
  isLast: boolean;
  onStart: () => void;
  onRepeat: () => void;
  onContinue: () => void;
}

function DayRow({ split, dayName, muscles, exercises, dayNum, done, previousSession, isLast, onStart, onRepeat, onContinue }: DayRowProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const startPress = usePressScale(0.96);
  const continuePress = usePressScale(0.96);
  const repeatPress = usePressScale(0.96);

  // How many unique exercises were logged in the previous session
  const loggedExercises = previousSession
    ? new Set((previousSession.workout_sets ?? []).map((ws) => ws.exercise_name)).size
    : 0;
  const totalExercises = exercises.length;

  return (
    <View style={{ borderBottomWidth: isLast ? 0 : 1, borderBottomColor: colors.separator }}>
      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: done ? 8 : 14, gap: 12 }}
      >
        {/* Checkmark circle */}
        <View style={{
          width: 28, height: 28, borderRadius: 14,
          backgroundColor: done ? '#ECFDF5' : colors.surface,
          borderWidth: 2,
          borderColor: done ? '#10B981' : colors.border,
          alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {done
            ? <Ionicons name="checkmark" size={14} color="#10B981" />
            : <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>{dayNum}</Text>
          }
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{
            color: done ? colors.textMuted : colors.text,
            fontWeight: '700',
            fontSize: 14,
            textDecorationLine: done ? 'line-through' : 'none',
          }}>
            {dayName}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
            {muscles.join(' · ')}
          </Text>
        </View>

        {/* Right side: exercise count + start button or done badge */}
        {done ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {/* Per-day exercise count */}
            <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9 }}>
              <Text style={{ color: '#059669', fontSize: 11, fontWeight: '700' }}>
                {loggedExercises}/{totalExercises} done ✓
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: colors.borderStrong, fontSize: 11 }}>{totalExercises} exercises</Text>
            <AnimatedTouchable
              onPress={onStart}
              onPressIn={startPress.onPressIn}
              onPressOut={startPress.onPressOut}
              style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: split.color + '18', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }, startPress.style]}
            >
              <Ionicons name="play" size={11} color={split.color} />
              <Text style={{ color: split.color, fontSize: 12, fontWeight: '700' }}>Start</Text>
            </AnimatedTouchable>
          </View>
        )}

        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.borderStrong} style={{ marginLeft: 2 }} />
      </TouchableOpacity>

      {/* Continue / Repeat buttons — only when day is done */}
      {done && (
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
          <AnimatedTouchable
            onPress={onContinue}
            onPressIn={continuePress.onPressIn}
            onPressOut={continuePress.onPressOut}
            style={[{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              backgroundColor: '#059669',
              paddingVertical: 8,
              borderRadius: 11,
            }, continuePress.style]}
          >
            <Ionicons name="arrow-forward-circle-outline" size={14} color="white" />
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>Continue</Text>
          </AnimatedTouchable>

          <AnimatedTouchable
            onPress={onRepeat}
            onPressIn={repeatPress.onPressIn}
            onPressOut={repeatPress.onPressOut}
          style={[{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 5,
                          backgroundColor: colors.surface,
                          paddingVertical: 8,
                          borderRadius: 11,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }, repeatPress.style]}
          >
                        <Ionicons name="refresh-outline" size={14} color={colors.textSub} />
                        <Text style={{ color: colors.textSub, fontSize: 12, fontWeight: '700' }}>Repeat</Text>
          </AnimatedTouchable>
        </View>
      )}

      {/* Expanded exercise list */}
      {expanded && (
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18 }}>
          {exercises.join(' · ')}
        </Text>
      </View>
      )}
    </View>
  );
}
