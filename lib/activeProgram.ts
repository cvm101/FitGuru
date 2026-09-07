import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { todayDate } from './date';

const KEY = 'active_program';
// Set once the account has been consulted, so a null on the server is treated as
// a deliberate removal instead of falling back to a stale device copy.
const SYNCED_KEY = 'active_program_synced';

export interface ActiveProgram {
  splitId: string;
  startDate: string;       // YYYY-MM-DD — when user first followed this program
  weekRestartAt?: string;  // ISO timestamp — when user last hit "Restart Week"
}

async function readCache(): Promise<ActiveProgram | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ActiveProgram) : null;
  } catch {
    return null;
  }
}

async function writeCache(program: ActiveProgram | null): Promise<void> {
  try {
    if (program) await AsyncStorage.setItem(KEY, JSON.stringify(program));
    else await AsyncStorage.removeItem(KEY);
  } catch {
    // Device storage is a cache only — the account copy is the source of truth.
  }
}

async function markSynced(): Promise<void> {
  try {
    await AsyncStorage.setItem(SYNCED_KEY, '1');
  } catch {}
}

async function hasSynced(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SYNCED_KEY)) === '1';
  } catch {
    return false;
  }
}

async function pushToAccount(userId: string, program: ActiveProgram | null): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      active_split_id: program?.splitId ?? null,
      active_split_started_on: program?.startDate ?? null,
      week_restart_at: program?.weekRestartAt ?? null,
    })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function getActiveProgram(userId?: string): Promise<ActiveProgram | null> {
  if (!userId) return readCache();

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('active_split_id, active_split_started_on, week_restart_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;

    if (data?.active_split_id) {
      const program: ActiveProgram = {
        splitId: data.active_split_id,
        startDate: data.active_split_started_on ?? todayDate(),
        weekRestartAt: data.week_restart_at ?? undefined,
      };
      await writeCache(program);
      await markSynced();
      return program;
    }

    // Nothing on the account. A device copy from before this synced is adopted
    // once; after that, an empty account means the user removed the program.
    const cached = await readCache();
    if (cached && !(await hasSynced())) {
      await pushToAccount(userId, cached);
      await markSynced();
      return cached;
    }

    await writeCache(null);
    await markSynced();
    return null;
  } catch {
    return readCache();
  }
}

export async function saveActiveProgram(userId: string, splitId: string): Promise<void> {
  const program: ActiveProgram = { splitId, startDate: todayDate() };
  await writeCache(program);
  try {
    await pushToAccount(userId, program);
    await markSynced();
  } catch {
    // Kept on the device; the next successful load pushes it to the account.
  }
}

export async function restartProgramWeek(userId: string, splitId: string): Promise<void> {
  const existing = await getActiveProgram(userId);
  const program: ActiveProgram = {
    splitId,
    startDate: existing?.startDate ?? todayDate(),
    weekRestartAt: new Date().toISOString(),
  };
  await writeCache(program);
  try {
    await pushToAccount(userId, program);
  } catch {}
}

export async function clearActiveProgram(userId: string): Promise<void> {
  await writeCache(null);
  try {
    await pushToAccount(userId, null);
    await markSynced();
  } catch {}
}
