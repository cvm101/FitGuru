import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'active_program';

export interface ActiveProgram {
  splitId: string;
  startDate: string;       // YYYY-MM-DD — when user first followed this program
  weekRestartAt?: string;  // ISO timestamp — when user last hit "Restart Week"
}

export async function getActiveProgram(): Promise<ActiveProgram | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ActiveProgram) : null;
  } catch {
    return null;
  }
}

export async function saveActiveProgram(splitId: string): Promise<void> {
  const data: ActiveProgram = {
    splitId,
    startDate: new Date().toISOString().split('T')[0],
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

export async function restartProgramWeek(splitId: string): Promise<void> {
  const existing = await getActiveProgram();
  const data: ActiveProgram = {
    splitId,
    startDate: existing?.startDate ?? new Date().toISOString().split('T')[0],
    weekRestartAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

export async function clearActiveProgram(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
