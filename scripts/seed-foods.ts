/**
 * One-time script: seeds the Supabase `foods` table with ~500 common foods.
 * Run once with: npx ts-node scripts/seed-foods.ts
 *
 * Requires EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { SEED_FOODS } from '../lib/data/foods-seed';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
);

async function seed() {
  console.log(`\n🌱  Seeding ${SEED_FOODS.length} foods into Supabase...\n`);

  // Insert in batches of 50 to stay under request limits
  const BATCH = 50;
  let inserted = 0;

  for (let i = 0; i < SEED_FOODS.length; i += BATCH) {
    const batch = SEED_FOODS.slice(i, i + BATCH).map((f) => ({
      name: f.name,
      brand: f.brand ?? '',
      energy_kcal: f.energy_kcal,
      protein_g: f.protein_g,
      carbs_g: f.carbs_g,
      fat_g: f.fat_g,
      source: 'seed',
    }));

    const { error } = await supabase
      .from('foods')
      .upsert(batch, { onConflict: 'name', ignoreDuplicates: true });

    if (error) {
      console.error(`  ✗ Batch ${Math.floor(i / BATCH) + 1} failed:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`  ✓ Batch ${Math.floor(i / BATCH) + 1} — ${inserted}/${SEED_FOODS.length}`);
    }
  }

  console.log(`\n✅  Done. ${inserted} foods seeded.\n`);
}

seed().catch(console.error);
