import { supabase } from '../supabase';
import type {
  WorkoutSession,
  NewWorkoutSession,
  WorkoutSet,
  NewWorkoutSet,
  ExerciseProgressPoint,
} from '../types';

export async function getWorkoutSessions(userId: string): Promise<WorkoutSession[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*, workout_sets(*)')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

/** Lightweight query for the activity heatmap — no sets join, full 26-week history */
export async function getWorkoutSessionDates(userId: string): Promise<string[]> {
  const since = new Date();
  since.setDate(since.getDate() - 26 * 7);
  const sinceStr = since.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('workout_sessions')
    .select('date')
    .eq('user_id', userId)
    .gte('date', sinceStr)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => r.date as string);
}

export async function getTodayWorkout(userId: string, date: string): Promise<WorkoutSession | null> {
  const { data } = await supabase
    .from('workout_sessions')
    .select('*, workout_sets(*)')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();
  return data ?? null;
}

export async function createWorkoutSession(session: NewWorkoutSession): Promise<WorkoutSession> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .insert(session)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addWorkoutSets(sets: NewWorkoutSet[]): Promise<WorkoutSet[]> {
  const { data, error } = await supabase
    .from('workout_sets')
    .insert(sets)
    .select();
  if (error) throw error;
  return data ?? [];
}

export async function deleteWorkoutSession(id: string): Promise<void> {
  const { error } = await supabase.from('workout_sessions').delete().eq('id', id);
  if (error) throw error;
}

export async function getExerciseProgress(
  userId: string,
  exerciseName: string
): Promise<ExerciseProgressPoint[]> {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('weight_kg, reps, workout_sessions!inner(date, user_id)')
    .eq('workout_sessions.user_id', userId)
    .eq('exercise_name', exerciseName)
    .not('weight_kg', 'is', null)
    .order('workout_sessions(date)', { ascending: true })
    .limit(30);
  if (error) throw error;

  // Group by date, pick max weight per day
  const grouped = new Map<string, { maxWeight: number; totalVolume: number }>();
  for (const row of data ?? []) {
    const session = row.workout_sessions as any;
    const date = session?.date ?? '';
    const weight = row.weight_kg ?? 0;
    const volume = weight * (row.reps ?? 0);
    const prev = grouped.get(date);
    if (!prev) {
      grouped.set(date, { maxWeight: weight, totalVolume: volume });
    } else {
      grouped.set(date, {
        maxWeight: Math.max(prev.maxWeight, weight),
        totalVolume: prev.totalVolume + volume,
      });
    }
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, val]) => ({ date, ...val }));
}
