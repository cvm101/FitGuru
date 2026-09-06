import { useState, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Vibration,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import exercisesData from '@/lib/data/exercises.json';
import type { ActiveExercise, ActiveSet, Exercise } from '@/lib/types';
import ExerciseSearch from './ExerciseSearch';
import AnimatedProgressBar from '@/components/ui/AnimatedProgressBar';

// ─── Isolated GIF panel ──────────────────────────────────────────────────────
// Wrapped in memo so parent re-renders (timers, set state) never touch this
// component — that's what caused the flicker / GIF restart.
const ExerciseGifPanel = memo(({ gifUrl, name }: { gifUrl: string; name: string }) => {
  return (
    <View style={{ backgroundColor: '#0F172A', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#1E293B' }}>
      {/* Dark container acts as placeholder while GIF loads — no flash */}
      <View style={{ width: 180, height: 180, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1E293B' }}>
        <Image
          source={{ uri: gifUrl }}
          style={{ width: 180, height: 180 }}
          resizeMode="cover"
          fadeDuration={200}
        />
      </View>
      <Text style={{ color: 'white', fontWeight: '700', fontSize: 13, marginTop: 10 }}>{name}</Text>
      <Text style={{ color: '#475569', fontSize: 10, marginTop: 2 }}>© Gym Visual · exercise demo</Text>
    </View>
  );
});

const ALL_EXERCISES: Exercise[] = exercisesData as Exercise[];

interface WorkoutSessionProps {
  visible: boolean;
  splitName: string;
  suggestedExercises?: string[];
  /** Pre-filled exercises (used for Continue — carries over previous weights/reps) */
  initialExercises?: ActiveExercise[];
  onFinish: (exercises: ActiveExercise[], durationMinutes: number) => Promise<void>;
  onClose: () => void;
}

const REST_PRESETS = [60, 90, 120, 180];

function generateId() { return Math.random().toString(36).slice(2); }

function formatTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function WorkoutSession({ visible, splitName, suggestedExercises = [], initialExercises, onFinish, onClose }: WorkoutSessionProps) {
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [saving, setSaving] = useState(false);
  // Which exercise card has its GIF demo panel open
  const [expandedGifId, setExpandedGifId] = useState<string | null>(null);

  // Workout timer
  const startTimeRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);

  // Rest timer
  const [restActive, setRestActive] = useState(false);
  const [restTotal, setRestTotal] = useState(90);
  const [restRemaining, setRestRemaining] = useState(90);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep screen awake while modal is open
  const keepAwakeActiveRef = useRef(false);

  useEffect(() => {
    if (visible) {
      activateKeepAwakeAsync('workout')
        .then(() => { keepAwakeActiveRef.current = true; })
        .catch(() => { keepAwakeActiveRef.current = false; });
      startTimeRef.current = Date.now();
      setElapsed(0);

      // Continue mode: use pre-filled exercises from a previous session
      if (initialExercises && initialExercises.length > 0) {
        setExercises(initialExercises);
      } else if (suggestedExercises.length > 0) {
        // Pre-populate with all suggested exercises from the split day
        const preloaded: ActiveExercise[] = suggestedExercises.map((name) => {
          const found = ALL_EXERCISES.find(
            (e) => e.name.toLowerCase() === name.toLowerCase()
          );
          return {
            id: generateId(),
            name: found?.name ?? name,
            muscleGroup: found?.muscleGroup ?? 'General',
            gifUrl: found?.gifUrl,
            thumbnailUrl: found?.thumbnailUrl,
            sets: [{ id: generateId(), weight: '', reps: '', rpe: '', done: false }],
          };
        });
        setExercises(preloaded);
      } else {
        setExercises([]);
      }
    } else {
      if (keepAwakeActiveRef.current) {
        try { deactivateKeepAwake('workout'); } catch (_) {}
        keepAwakeActiveRef.current = false;
      }
      stopRestTimer();
      setExercises([]);
    }
  }, [visible]);

  // Workout elapsed ticker
  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [visible]);

  // Rest timer countdown
  function startRestTimer(seconds: number) {
    stopRestTimer();
    setRestTotal(seconds);
    setRestRemaining(seconds);
    setRestActive(true);
    restRef.current = setInterval(() => {
      setRestRemaining((prev) => {
        if (prev <= 1) {
          stopRestTimer();
          Vibration.vibrate(Platform.OS === 'android' ? [0, 300, 100, 300] : 400);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function stopRestTimer() {
    if (restRef.current) { clearInterval(restRef.current); restRef.current = null; }
    setRestActive(false);
  }

  useEffect(() => { return () => stopRestTimer(); }, []);

  // Exercise management
  function addExercise(ex: Exercise) {
    const set: ActiveSet = { id: generateId(), weight: '', reps: '', rpe: '', done: false };
    setExercises((prev) => [...prev, {
      id: generateId(),
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      gifUrl: ex.gifUrl,
      thumbnailUrl: ex.thumbnailUrl,
      sets: [set],
    }]);
    setShowExerciseSearch(false);
  }

  function addSet(exerciseId: string) {
    setExercises((prev) => prev.map((ex) =>
      ex.id === exerciseId
        ? { ...ex, sets: [...ex.sets, { id: generateId(), weight: ex.sets[ex.sets.length - 1]?.weight ?? '', reps: '', rpe: '', done: false }] }
        : ex
    ));
  }

  function updateSet(exerciseId: string, setId: string, field: 'weight' | 'reps' | 'rpe', value: string) {
    setExercises((prev) => prev.map((ex) =>
      ex.id === exerciseId
        ? { ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)) }
        : ex
    ));
  }

  function toggleSetDone(exerciseId: string, setId: string) {
    setExercises((prev) => prev.map((ex) =>
      ex.id === exerciseId
        ? { ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, done: !s.done } : s)) }
        : ex
    ));
    // Auto-start rest timer when set is marked done
    startRestTimer(restTotal);
  }

  function removeExercise(id: string) { setExercises((prev) => prev.filter((ex) => ex.id !== id)); }
  function removeSet(exerciseId: string, setId: string) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) } : ex
      ).filter((ex) => ex.sets.length > 0)
    );
  }

  async function handleFinish() {
    if (exercises.length === 0) { Alert.alert('Empty Workout', 'Add at least one exercise.'); return; }
    // Only save exercises that actually have set data — skip empty ones
    const loggedExercises = exercises.filter((ex) => ex.sets.some((s) => s.weight || s.reps));
    if (loggedExercises.length === 0) {
      Alert.alert('No Sets Logged', 'Fill in at least one weight or rep count before finishing.');
      return;
    }
    setSaving(true);
    try { await onFinish(loggedExercises, Math.ceil(elapsed / 60)); } finally { setSaving(false); }
  }

  function handleClose() {
    setExercises([]);
    onClose();
  }

  const doneCount = exercises.reduce((s, e) => s + e.sets.filter((x) => x.done).length, 0);
  const totalCount = exercises.reduce((s, e) => s + e.sets.length, 0);
  const restPct = restTotal > 0 ? (restTotal - restRemaining) / restTotal : 0;

  if (showExerciseSearch) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
            <TouchableOpacity onPress={() => setShowExerciseSearch(false)} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={22} color="#64748B" />
            </TouchableOpacity>
            <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 16 }}>Add Exercise</Text>
            <View style={{ width: 30 }} />
          </View>
          <ExerciseSearch onSelect={addExercise} selected={exercises.map((e) => e.name)} />
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
        {/* Header */}
        <LinearGradient colors={['#0F172A', '#1E293B']} style={{ paddingTop: 48, paddingBottom: 16, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <TouchableOpacity onPress={handleClose} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>

            {/* Workout timer */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 }}>
              <Ionicons name="timer-outline" size={14} color="white" />
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 15, fontVariant: ['tabular-nums'] as any }}>{formatTime(elapsed)}</Text>
            </View>

            <TouchableOpacity
              onPress={handleFinish}
              disabled={saving}
              style={{ backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>{saving ? 'Saving…' : 'Finish'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ color: 'white', fontWeight: '800', fontSize: 18 }}>{splitName}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>
            {exercises.length} exercises · {doneCount}/{totalCount} sets done
          </Text>
        </LinearGradient>

        {/* Rest timer bar */}
        {restActive && (
          <View style={{ backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', padding: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="timer" size={14} color="#059669" />
                <Text style={{ color: '#059669', fontWeight: '700', fontSize: 13 }}>Rest Timer</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: '#0F172A', fontWeight: '800', fontSize: 18, fontVariant: ['tabular-nums'] as any }}>{formatTime(restRemaining)}</Text>
                <TouchableOpacity onPress={stopRestTimer} style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="close" size={14} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>
            {/* Progress bar */}
            <AnimatedProgressBar percent={restPct * 100} height={5} trackColor="#ECFDF5" color={restRemaining === 0 ? '#10B981' : '#059669'} />
            {/* Preset buttons */}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
              {REST_PRESETS.map((s) => (
                <TouchableOpacity key={s} onPress={() => startRestTimer(s)} style={{ flex: 1, paddingVertical: 4, borderRadius: 8, backgroundColor: restTotal === s && restActive ? '#059669' : '#F1F5F9', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: restTotal === s && restActive ? 'white' : '#64748B' }}>{s}s</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
          {exercises.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 48, gap: 10 }}>
              <View style={{ width: 64, height: 64, backgroundColor: '#ECFDF5', borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="barbell-outline" size={30} color="#059669" />
              </View>
              <Text style={{ color: '#1E293B', fontWeight: '700', fontSize: 16 }}>Add your first exercise</Text>
              <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', paddingHorizontal: 32 }}>
                Search from 50+ exercises to start logging sets
              </Text>
            </View>
          )}

          {exercises.map((ex) => (
            <View key={ex.id} style={{ backgroundColor: 'white', borderRadius: 20, marginBottom: 12, overflow: 'hidden', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 }}>
              {/* Exercise header */}
              <TouchableOpacity
                onPress={() => setExpandedGifId(expandedGifId === ex.id ? null : ex.id)}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                  {/* Thumbnail or muscle-group icon */}
                  {ex.thumbnailUrl ? (
                    <Image
                      source={{ uri: ex.thumbnailUrl }}
                      style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#F1F5F9' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="barbell-outline" size={18} color="#059669" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 14 }}>{ex.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Text style={{ color: '#94A3B8', fontSize: 11 }}>{ex.muscleGroup}</Text>
                      {ex.gifUrl && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#CBD5E1' }} />
                          <Text style={{ color: '#059669', fontSize: 10, fontWeight: '600' }}>
                            {expandedGifId === ex.id ? 'Hide demo' : 'See demo'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {ex.gifUrl && (
                    <Ionicons
                      name={expandedGifId === ex.id ? 'chevron-up' : 'play-circle-outline'}
                      size={18}
                      color="#059669"
                    />
                  )}
                  <TouchableOpacity onPress={() => removeExercise(ex.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              {/* GIF Demo panel — expands when you tap the exercise header */}
              {expandedGifId === ex.id && ex.gifUrl && (
                <ExerciseGifPanel gifUrl={ex.gifUrl} name={ex.name} />
              )}

              {/* Column headers */}
              <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#F8FAFC' }}>
                <Text style={{ width: 28, color: '#94A3B8', fontSize: 10, fontWeight: '700' }}>SET</Text>
                <Text style={{ flex: 1, color: '#94A3B8', fontSize: 10, fontWeight: '700', textAlign: 'center' }}>KG</Text>
                <Text style={{ flex: 1, color: '#94A3B8', fontSize: 10, fontWeight: '700', textAlign: 'center' }}>REPS</Text>
                <Text style={{ width: 44, color: '#94A3B8', fontSize: 10, fontWeight: '700', textAlign: 'center' }}>RPE</Text>
                <Text style={{ width: 32, color: '#94A3B8', fontSize: 10, fontWeight: '700', textAlign: 'center' }}>✓</Text>
              </View>

              {/* Sets */}
              {ex.sets.map((set, sIdx) => (
                <View key={set.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: set.done ? '#ECFDF5' : 'white', borderBottomWidth: 1, borderBottomColor: '#F8FAFC' }}>
                  <Text style={{ width: 28, color: '#64748B', fontSize: 13, fontWeight: '700' }}>{sIdx + 1}</Text>
                  <TextInput
                    style={{ flex: 1, textAlign: 'center', color: '#0F172A', fontSize: 14, fontWeight: '600', backgroundColor: set.done ? 'rgba(16,185,129,0.1)' : '#F8FAFC', borderRadius: 8, paddingVertical: 5, marginHorizontal: 2 }}
                    placeholder="—"
                    placeholderTextColor="#CBD5E1"
                    value={set.weight}
                    onChangeText={(v) => updateSet(ex.id, set.id, 'weight', v)}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                  <TextInput
                    style={{ flex: 1, textAlign: 'center', color: '#0F172A', fontSize: 14, fontWeight: '600', backgroundColor: set.done ? 'rgba(16,185,129,0.1)' : '#F8FAFC', borderRadius: 8, paddingVertical: 5, marginHorizontal: 2 }}
                    placeholder="—"
                    placeholderTextColor="#CBD5E1"
                    value={set.reps}
                    onChangeText={(v) => updateSet(ex.id, set.id, 'reps', v)}
                    keyboardType="number-pad"
                    selectTextOnFocus
                  />
                  {/* RPE input */}
                  <TextInput
                    style={{ width: 44, textAlign: 'center', color: '#059669', fontSize: 13, fontWeight: '700', backgroundColor: '#ECFDF5', borderRadius: 8, paddingVertical: 5, marginHorizontal: 2 }}
                    placeholder="—"
                    placeholderTextColor="#A7F3D0"
                    value={set.rpe}
                    onChangeText={(v) => updateSet(ex.id, set.id, 'rpe', v)}
                    keyboardType="decimal-pad"
                    maxLength={4}
                    selectTextOnFocus
                  />
                  <TouchableOpacity onPress={() => toggleSetDone(ex.id, set.id)} style={{ width: 32, alignItems: 'center' }}>
                    <Ionicons
                      name={set.done ? 'checkmark-circle' : 'ellipse-outline'}
                      size={26}
                      color={set.done ? '#10B981' : '#CBD5E1'}
                    />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Add set */}
              <TouchableOpacity onPress={() => addSet(ex.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12 }}>
                <Ionicons name="add-circle-outline" size={18} color="#059669" />
                <Text style={{ color: '#059669', fontWeight: '600', fontSize: 13 }}>Add Set</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Add exercise button */}
          <TouchableOpacity
            onPress={() => setShowExerciseSearch(true)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: '#A7F3D0', borderRadius: 18, paddingVertical: 16, backgroundColor: '#ECFDF5' }}
          >
            <Ionicons name="add" size={22} color="#059669" />
            <Text style={{ color: '#059669', fontWeight: '700', fontSize: 15 }}>Add Exercise</Text>
          </TouchableOpacity>

          {/* Rest timer manual trigger */}
          {!restActive && exercises.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {REST_PRESETS.map((s) => (
                <TouchableOpacity key={s} onPress={() => startRestTimer(s)} style={{ flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: 'white', borderWidth: 1.5, borderColor: '#E2E8F0', alignItems: 'center' }}>
                  <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '600' }}>{s}s rest</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
