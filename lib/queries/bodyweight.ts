import { supabase } from '@/lib/supabase';
import type { BodyWeightLog, NewBodyWeightLog } from '@/lib/types';

export async function getBodyWeightLogs(userId: string, limit = 90): Promise<BodyWeightLog[]> {
  const { data, error } = await supabase
    .from('body_weight_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function upsertBodyWeight(log: NewBodyWeightLog): Promise<BodyWeightLog> {
  const { data, error } = await supabase
    .from('body_weight_logs')
    .upsert(log, { onConflict: 'user_id,date' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBodyWeightLog(id: string): Promise<void> {
  const { error } = await supabase.from('body_weight_logs').delete().eq('id', id);
  if (error) throw error;
}

export async function getLatestWeight(userId: string): Promise<BodyWeightLog | null> {
  const { data, error } = await supabase
    .from('body_weight_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
