import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ActiveExercise, ActiveSet, Exercise, WorkoutSplit } from '@/lib/types';
import ExerciseSearch from './ExerciseSearch';

interface WorkoutSessionProps {
  visible: boolean;
  splitName: string;
  suggestedExercises?: string[];
  onFinish: (exercises: ActiveExercise[], durationMinutes: number) => Promise<void>;
  onClose: () => void;
}

function generateId() {
  return Math.random().toString(36).slice(2);
}

export default function WorkoutSession({
  visible,
  splitName,
  suggestedExercises = [],
  onFinish,
  onClose,
}: WorkoutSessionProps) {
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [saving, setSaving] = useState(false);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, startTime]);

  function formatTime(secs: number) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function addExercise(ex: Exercise) {
    const set: ActiveSet = { id: generateId(), weight: '', reps: '', done: false };
    setExercises((prev) => [
      ...prev,
      { id: generateId(), name: ex.name, muscleGroup: ex.muscleGroup, sets: [set] },
    ]);
    setShowExerciseSearch(false);
  }

  function addSet(exerciseId: string) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, sets: [...ex.sets, { id: generateId(), weight: '', reps: '', done: false }] }
          : ex
      )
    );
  }

  function updateSet(exerciseId: string, setId: string, field: 'weight' | 'reps', value: string) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)),
            }
          : ex
      )
    );
  }

  function toggleSetDone(exerciseId: string, setId: string) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, done: !s.done } : s)),
            }
          : ex
      )
    );
  }

  function removeExercise(exerciseId: string) {
    setExercises((prev) => prev.filter((ex) => ex.id !== exerciseId));
  }

  function removeSet(exerciseId: string, setId: string) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) }
          : ex
      ).filter((ex) => ex.sets.length > 0)
    );
  }

  async function handleFinish() {
    if (exercises.length === 0) {
      Alert.alert('Empty Workout', 'Add at least one exercise before finishing.');
      return;
    }
    const hasSets = exercises.some((ex) => ex.sets.some((s) => s.weight || s.reps));
    if (!hasSets) {
      Alert.alert('No Sets Logged', 'Log at least one set before finishing.');
      return;
    }
    setSaving(true);
    try {
      await onFinish(exercises, Math.ceil(elapsed / 60));
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (exercises.length > 0) {
      Alert.alert('Discard Workout?', 'Your workout will be lost.', [
        { text: 'Keep Going', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => { setExercises([]); onClose(); } },
      ]);
    } else {
      onClose();
    }
  }

  if (showExerciseSearch) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-background">
          <View className="flex-row items-center justify-between px-4 pt-4 pb-3 bg-white border-b border-border">
            <TouchableOpacity onPress={() => setShowExerciseSearch(false)} className="p-1">
              <Ionicons name="arrow-back" size={22} color="#64748B" />
            </TouchableOpacity>
            <Text className="text-slate-800 font-bold text-base">Add Exercise</Text>
            <View style={{ width: 30 }} />
          </View>
          <ExerciseSearch
            onSelect={addExercise}
            selected={exercises.map((e) => e.name)}
          />
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="bg-primary px-4 pt-12 pb-4">
          <View className="flex-row items-center justify-between mb-1">
            <TouchableOpacity onPress={handleClose} className="p-1">
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
            <View className="flex-row items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
              <Ionicons name="time-outline" size={14} color="white" />
              <Text className="text-white font-mono font-semibold text-sm">{formatTime(elapsed)}</Text>
            </View>
            <TouchableOpacity
              onPress={handleFinish}
              disabled={saving}
              className="bg-white px-4 py-1.5 rounded-full"
            >
              <Text className="text-primary font-bold text-sm">{saving ? 'Saving...' : 'Finish'}</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-white font-bold text-xl mt-1">{splitName}</Text>
          <Text className="text-white/70 text-sm">{exercises.length} exercises · {exercises.reduce((s, e) => s + e.sets.filter((x) => x.done).length, 0)} sets done</Text>
        </View>

        <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
          {exercises.length === 0 && (
            <View className="items-center py-12 gap-3">
              <View className="w-16 h-16 bg-primary-lighter rounded-2xl items-center justify-center">
                <Ionicons name="barbell-outline" size={32} color="#10B981" />
              </View>
              <Text className="text-slate-700 font-semibold text-lg">Add your first exercise</Text>
              <Text className="text-slate-400 text-sm text-center px-8">
                {suggestedExercises.length > 0 ? `Suggested: ${suggestedExercises.slice(0, 3).join(', ')}...` : 'Search from 50+ exercises'}
              </Text>
            </View>
          )}

          {exercises.map((ex, exIdx) => (
            <View
              key={ex.id}
              className="bg-white rounded-2xl mb-4 overflow-hidden"
              style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}
            >
              {/* Exercise header */}
              <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-50">
                <View>
                  <Text className="text-slate-800 font-bold">{ex.name}</Text>
                  <Text className="text-slate-400 text-xs">{ex.muscleGroup}</Text>
                </View>
                <TouchableOpacity onPress={() => removeExercise(ex.id)}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>

              {/* Set headers */}
              <View className="flex-row px-4 py-2 bg-slate-50">
                <Text className="text-slate-400 text-xs w-8">SET</Text>
                <Text className="text-slate-400 text-xs flex-1 text-center">WEIGHT (kg)</Text>
                <Text className="text-slate-400 text-xs flex-1 text-center">REPS</Text>
                <Text className="text-slate-400 text-xs w-10 text-center">DONE</Text>
              </View>

              {/* Sets */}
              {ex.sets.map((set, sIdx) => (
                <View
                  key={set.id}
                  className={`flex-row items-center px-4 py-2 ${set.done ? 'bg-primary-lighter' : ''}`}
                >
                  <Text className="text-slate-500 text-sm font-semibold w-8">{sIdx + 1}</Text>
                  <TextInput
                    className="flex-1 text-slate-800 text-center bg-slate-50 rounded-lg py-1.5 mx-1 text-sm"
                    placeholder="0"
                    placeholderTextColor="#CBD5E1"
                    value={set.weight}
                    onChangeText={(v) => updateSet(ex.id, set.id, 'weight', v)}
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    className="flex-1 text-slate-800 text-center bg-slate-50 rounded-lg py-1.5 mx-1 text-sm"
                    placeholder="0"
                    placeholderTextColor="#CBD5E1"
                    value={set.reps}
                    onChangeText={(v) => updateSet(ex.id, set.id, 'reps', v)}
                    keyboardType="number-pad"
                  />
                  <TouchableOpacity
                    onPress={() => toggleSetDone(ex.id, set.id)}
                    className="w-10 items-center"
                  >
                    <Ionicons
                      name={set.done ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={set.done ? '#10B981' : '#CBD5E1'}
                    />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Add set */}
              <TouchableOpacity
                onPress={() => addSet(ex.id)}
                className="flex-row items-center gap-2 px-4 py-3 border-t border-slate-50"
              >
                <Ionicons name="add-circle-outline" size={18} color="#10B981" />
                <Text className="text-primary text-sm font-medium">Add Set</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Add exercise button */}
          <TouchableOpacity
            onPress={() => setShowExerciseSearch(true)}
            className="flex-row items-center justify-center gap-2 border-2 border-dashed border-primary/30 rounded-2xl py-4"
          >
            <Ionicons name="add" size={20} color="#10B981" />
            <Text className="text-primary font-semibold">Add Exercise</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}
