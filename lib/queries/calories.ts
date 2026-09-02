import { supabase } from '../supabase';
import type { DailyCalories, FoodLog, MacroSummary, NewFoodLog } from '../types';

export async function getFoodLogs(userId: string, date: string): Promise<FoodLog[]> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addFoodLog(log: NewFoodLog): Promise<FoodLog> {
  const { data, error } = await supabase
    .from('food_logs')
    .insert(log)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFoodLog(id: string): Promise<void> {
  const { error } = await supabase.from('food_logs').delete().eq('id', id);
  if (error) throw error;
}

export async function getDailyMacros(userId: string, date: string): Promise<MacroSummary> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('calories, protein_g, carbs_g, fat_g')
    .eq('user_id', userId)
    .eq('date', date);
  if (error) throw error;
  return (data ?? []).reduce(
    (acc, row) => ({
      calories: acc.calories + row.calories,
      protein: acc.protein + row.protein_g,
      carbs: acc.carbs + row.carbs_g,
      fat: acc.fat + row.fat_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export async function getWeeklyCalories(userId: string): Promise<DailyCalories[]> {
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const { data, error } = await supabase
    .from('food_logs')
    .select('date, calories')
    .eq('user_id', userId)
    .in('date', dates);
  if (error) throw error;

  return dates.map((date) => ({
    date,
    calories: (data ?? [])
      .filter((row) => row.date === date)
      .reduce((sum, row) => sum + row.calories, 0),
  }));
}

// ─── Session-level search cache ───────────────────────────────────────────────
// Same query within an app session returns instantly without hitting the network
const searchCache = new Map<string, { results: any[]; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function searchOpenFoodFacts(query: string, signal?: AbortSignal) {
  const key = query.toLowerCase().trim();

  // Return from cache if fresh
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.results;
  }

  // 5-second timeout — never leave the user waiting longer
  const timeoutId = setTimeout(() => {
    if (signal && !signal.aborted) (signal as any)._timedOut = true;
  }, 5000);

  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '10',
    sort_by: 'unique_scans_n',   // most-scanned = most popular = better results
    fields: 'id,code,product_name,brands,nutriments,image_small_url',
  });

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?${params}`,
      { signal }
    );
    const json = await res.json();

    const results = (json.products ?? [])
      .filter((p: any) => p.product_name && p.nutriments?.['energy-kcal_100g'])
      .map((p: any) => ({
        id: p.code ?? p.id ?? Math.random().toString(),
        product_name: p.product_name ?? 'Unknown',
        brands: p.brands ?? '',
        energy_kcal_100g: Math.round(p.nutriments['energy-kcal_100g'] ?? 0),
        proteins_100g: Math.round((p.nutriments['proteins_100g'] ?? 0) * 10) / 10,
        carbohydrates_100g: Math.round((p.nutriments['carbohydrates_100g'] ?? 0) * 10) / 10,
        fat_100g: Math.round((p.nutriments['fat_100g'] ?? 0) * 10) / 10,
        image_small_url: p.image_small_url,
      }));

    // Store in cache
    searchCache.set(key, { results, ts: Date.now() });
    return results;
  } finally {
    clearTimeout(timeoutId);
  }
}
