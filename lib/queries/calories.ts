import { supabase } from '../supabase';
import { toLocalISODate } from '../date';
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

export async function updateFoodLog(
  id: string,
  quantity: number,
  calories: number,
  protein_g: number,
  carbs_g: number,
  fat_g: number,
): Promise<void> {
  const { error } = await supabase
    .from('food_logs')
    .update({ quantity, calories, protein_g, carbs_g, fat_g })
    .eq('id', id);
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
    return toLocalISODate(d);
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

// ─── Shared food result type ──────────────────────────────────────────────────
export interface FoodSearchResult {
  id: string;
  product_name: string;
  brands: string;
  energy_kcal_100g: number;
  proteins_100g: number;
  carbohydrates_100g: number;
  fat_100g: number;
  image_small_url?: string;
  source?: 'local' | 'openfoodfacts';
}

// ─── Session-level in-memory cache ────────────────────────────────────────────
const searchCache = new Map<string, { results: FoodSearchResult[]; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Step 1: Search our Supabase foods table (< 100ms) ───────────────────────
async function searchLocalFoods(query: string): Promise<FoodSearchResult[]> {
  const { data, error } = await supabase
    .from('foods')
    .select('id, name, brand, energy_kcal, protein_g, carbs_g, fat_g, image_url')
    .textSearch('search_vec', query, { type: 'plain', config: 'simple' })
    .order('search_hits', { ascending: false })
    .limit(8);

  if (error || !data?.length) {
    // Fallback to ILIKE if full-text returns nothing (handles short terms)
    const { data: likeData } = await supabase
      .from('foods')
      .select('id, name, brand, energy_kcal, protein_g, carbs_g, fat_g, image_url')
      .ilike('name', `%${query}%`)
      .order('search_hits', { ascending: false })
      .limit(8);
    return (likeData ?? []).map(dbRowToResult);
  }

  return data.map(dbRowToResult);
}

function dbRowToResult(row: any): FoodSearchResult {
  return {
    id: `local-${row.id}`,
    product_name: row.name,
    brands: row.brand ?? '',
    energy_kcal_100g: row.energy_kcal,
    proteins_100g: row.protein_g,
    carbohydrates_100g: row.carbs_g,
    fat_100g: row.fat_g,
    image_small_url: row.image_url ?? undefined,
    source: 'local',
  };
}

// ─── Step 2: Save Open Food Facts results back to Supabase (background) ───────
async function saveToLocalDB(results: FoodSearchResult[]) {
  const rows = results.map((r) => ({
    name: r.product_name,
    brand: r.brands,
    energy_kcal: r.energy_kcal_100g,
    protein_g: r.proteins_100g,
    carbs_g: r.carbohydrates_100g,
    fat_g: r.fat_100g,
    image_url: r.image_small_url ?? null,
    source: 'openfoodfacts',
  }));
  // Fire-and-forget — don't block the UI, ignore errors
  supabase
    .from('foods')
    .upsert(rows, { onConflict: 'name', ignoreDuplicates: true })
    .then(() => {})
    .catch(() => {});
}

// ─── Step 3: Fetch from Open Food Facts (slow, only called as fallback) ───────
async function fetchFromOpenFoodFacts(
  query: string,
  signal?: AbortSignal,
): Promise<FoodSearchResult[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '10',
    sort_by: 'unique_scans_n',
    fields: 'id,code,product_name,brands,nutriments,image_small_url',
  });

  const res = await fetch(
    `https://world.openfoodfacts.org/cgi/search.pl?${params}`,
    { signal }
  );
  const json = await res.json();

  return (json.products ?? [])
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
      source: 'openfoodfacts' as const,
    }));
}

// ─── Main search: cascade local → OFF fallback → auto-save ───────────────────
export async function searchOpenFoodFacts(
  query: string,
  signal?: AbortSignal,
): Promise<FoodSearchResult[]> {
  const key = query.toLowerCase().trim();

  // 1. In-memory cache (instant)
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.results;
  }

  // 2. Search local Supabase DB (< 100ms)
  const localResults = await searchLocalFoods(key);
  if (localResults.length >= 3) {
    // Good enough — return immediately, no network call
    searchCache.set(key, { results: localResults, ts: Date.now() });
    // Increment search_hits in background for popularity tracking
    supabase.rpc('increment_food_hits', { food_name: key }).catch(() => {});
    return localResults;
  }

  // 3. Fallback to Open Food Facts with 5s timeout
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), 5000);
  const combinedSignal = signal ?? timeoutController.signal;

  try {
    const offResults = await fetchFromOpenFoodFacts(key, combinedSignal);

    // Merge: local first, then OFF results (deduplicated by name)
    const localNames = new Set(localResults.map((r) => r.product_name.toLowerCase()));
    const newOffResults = offResults.filter(
      (r) => !localNames.has(r.product_name.toLowerCase())
    );
    const merged = [...localResults, ...newOffResults].slice(0, 10);

    searchCache.set(key, { results: merged, ts: Date.now() });

    // Auto-save new OFF results to Supabase in background
    if (newOffResults.length > 0) saveToLocalDB(newOffResults);

    return merged;
  } catch (err: any) {
    // Timeout or abort — return whatever local results we have
    if (localResults.length > 0) return localResults;
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
